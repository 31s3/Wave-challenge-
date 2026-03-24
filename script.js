// --- إعدادات السيرفر الحقيقي (Firebase) ---
const firebaseConfig = {
    apiKey: "AIzaSyBdWUpilKNtduxoW71avupQOOGurHq_Hcw",
    authDomain: "wave-challenge-f4f3f.firebaseapp.com",
    databaseURL: "https://wave-challenge-f4f3f-default-rtdb.firebaseio.com",
    projectId: "wave-challenge-f4f3f",
    storageBucket: "wave-challenge-f4f3f.firebasestorage.app",
    messagingSenderId: "414978053162",
    appId: "1:414978053162:web:8bc1083fa328ac9c9c5f53",
    measurementId: "G-DNZ2VWDC2X"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.database();
let currentRoomID = null;

// --- البيانات العالمية (تم توليد ID واسم فريد لكل جهاز) ---
let generatedID = Math.floor(Math.random() * 899999) + 100000;
let userData = { 
    username: "لاعب_" + generatedID.toString().substring(0,3), 
    playerID: generatedID.toString(), 
    coins: 5000, points: 12450,
    nameChangesToday: 0, lastChangeDate: new Date().toDateString()
};
let isAudioInit = false;

// --- الصوتيات ---
const sfxMenu = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_bb630cc098.mp3?filename=click-button-140881.mp3');
const sfxPlay = new Audio('https://cdn.pixabay.com/download/audio/2022/03/15/audio_10e0600bc1.mp3?filename=interface-button-154180.mp3');
const sfxCorrect = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=success-1-6297.mp3');
const sfxWrong = new Audio('https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3?filename=error-126627.mp3');
const sfxTimer = new Audio('https://cdn.pixabay.com/download/audio/2021/08/09/audio_82c219662b.mp3?filename=tick-tock-40075.mp3');
const bgMusic = new Audio('https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=chill-abstract-intention-116199.mp3');

bgMusic.loop = true; bgMusic.volume = 0.3; let sfxVolumeVal = 0.8;
function initAudio() { if(!isAudioInit) { bgMusic.play().catch(e=>{}); isAudioInit = true; } }
function playSfx(type) { let sound = { 'menu': sfxMenu, 'play': sfxPlay, 'correct': sfxCorrect, 'wrong': sfxWrong, 'timer': sfxTimer }[type]; if(sound) { sound.currentTime = 0; sound.volume = sfxVolumeVal; sound.play().catch(e=>{}); } }
function updateMusicVol(val) { bgMusic.volume = val / 100; }
function updateSfxVol(val) { sfxVolumeVal = val / 100; }

// --- قواعد بيانات الأسئلة ---
let qDB = {
    A: [ { q: "ما هي عاصمة العراق؟", a: ["البصرة", "بغداد", "أربيل"], c: 1 }, { q: "ما هو الكوكب الأحمر؟", a: ["الزهرة", "المشتري", "المريخ"], c: 2 }, { q: "أكبر محيط في العالم؟", a: ["الهادئ", "الهندي", "الأطلسي"], c: 0 }, { q: "أسرع حيوان بري؟", a: ["الأسد", "الفهد", "الغزال"], c: 1 } ],
    B: [ { img: "https://images.unsplash.com/photo-1543349689-9a4d426bee8e?w=300", q: "أين يقع هذا المعلم؟", a: ["لندن", "باريس", "برلين"], c: 1 }, { img: "https://images.unsplash.com/photo-1539650116574-1ef250440bf0?w=300", q: "في أي دولة توجد هذه الأهرامات؟", a: ["مصر", "المكسيك", "السودان"], c: 0 }, { img: "https://images.unsplash.com/photo-1564507592208-028f090b82eb?w=300", q: "ما اسم هذا المعلم؟", a: ["تاج محل", "قصر الحمراء", "البتراء"], c: 0 } ],
    C: [ { q: "اكتب اسم عاصمة فرنسا:", ans: "باريس" }, { q: "ما هو ناتج 5 مضروباً في 6؟", ans: "30" }, { q: "اكتب لون الدم في جسم الإنسان:", ans: "احمر" } ],
    D: [ { text: "الأسد هو حيوان من الثدييات، يُعرف بقوته وشجاعته، ويُلقب بملك الغابة لأنه يفرض سيطرته على بيئته.", q: "بماذا يُلقب الأسد حسب النص؟", a: ["المفترس", "ملك الغابة", "الأسرع"], c: 1 }, { text: "يعتبر الماء سر الحياة، يتكون من ذرتي هيدروجين وذرة أوكسجين، ويغطي 71% من مساحة الأرض.", q: "كم نسبة الماء في الأرض حسب النص؟", a: ["50%", "71%", "90%"], c: 1 } ]
};

let availableQs = { A:[], B:[], C:[], D:[] };
function getQuestion(stageType) { if(availableQs[stageType].length === 0) availableQs[stageType] = [...qDB[stageType]]; let idx = Math.floor(Math.random() * availableQs[stageType].length); return availableQs[stageType].splice(idx, 1)[0]; }

// --- نظام المباريات ---
let matchTimer, matchTimeLeft = 15;
let currentMatchStage = 0; 
let currentMatchScore = 0;
let matchMode = 'ai'; 
let currentQData = null;
let onlineScores = [0, 0, 0, 0];

// --- متغيرات الأونلاين الجديدة ---
let isPlayer1 = false;
let sharedQuestions = []; 
let opponentID = null;

function openOnlineRoomModal() {
    playSfx('menu');
    const title = document.getElementById('modalTitle'); 
    const body = document.getElementById('modalBody'); 
    document.getElementById('modalOverlay').style.display = 'flex';
    title.innerText = "لعب مع صديق 👥";
    body.innerHTML = `
        <div style="text-align:center; display:flex; flex-direction:column; gap:15px;">
            <p style="color:#aaa; font-size:0.9rem;">أدخل رقم غرفة لتدخل مع صديقك، أو ابتكر رقماً وأعطه لصديقك ليدخله!</p>
            <input type="text" id="roomInput" class="input-field" placeholder="مثال: 5566" style="text-align:center; font-size:1.5rem; letter-spacing:5px;">
            <button class="premium-btn friend-btn" onclick="startMatch('friend', document.getElementById('roomInput').value)">دخول الغرفة 🚀</button>
        </div>
    `;
}

function startMatch(mode, roomID = null) {
    playSfx('play'); matchMode = mode; currentMatchStage = 0; currentMatchScore = 0; sharedQuestions = [];
    document.getElementById('menuIconBtn').style.display = 'none';
    document.getElementById('mainScreen').style.display = 'none';
    document.getElementById('gameMatchScreen').style.display = 'flex';
    
    if (mode === 'ai') {
        document.getElementById('matchPlayersBar').style.display = 'none';
        document.getElementById('waitingScreen').style.display = 'none';
        document.getElementById('quizBox').style.display = 'flex';
        updateMatchUI(); 
        loadMatchStage();
    } else if (mode === 'online') {
        findRandomOpponent();
    } else if (mode === 'friend') {
        if(!roomID || roomID.trim() === "") return alert("الرجاء كتابة رقم للغرفة!");
        currentRoomID = roomID.trim();
        closeModal();
        setupOnlineGameDB(); // نفس نظامك السابق للأصدقاء
    }
}

// === نظام البحث عن منافس عشوائي (Real Matchmaking) ===
function findRandomOpponent() {
    document.getElementById('quizBox').style.display = 'none';
    document.getElementById('waitingScreen').style.display = 'block';
    document.getElementById('matchPlayersBar').style.display = 'flex';
    document.getElementById('waitingText').innerText = "جاري البحث عن منافس... ⏳";
    
    const roomsRef = db.ref('matchmaking');
    
    // البحث عن غرفة فيها لاعب ينتظر
    roomsRef.orderByChild('status').equalTo('waiting').limitToFirst(1).once('value', snapshot => {
        if (snapshot.exists()) {
            // وجدنا غرفة! ننضم إليها كلاعب ثاني
            let roomKey = Object.keys(snapshot.val())[0];
            currentRoomID = roomKey;
            isPlayer1 = false;
            joinRandomRoom(roomKey, snapshot.val()[roomKey]);
        } else {
            // لم نجد غرفة، ننشئ غرفة جديدة وننتظر
            createRandomRoom();
        }
    });
}

function createRandomRoom() {
    isPlayer1 = true;
    currentRoomID = db.ref('matchmaking').push().key;
    
    // سحب 4 أسئلة للمباراة لكي يجاوب عليها اللاعبان
    sharedQuestions = [getQuestion('A'), getQuestion('B'), getQuestion('C'), getQuestion('D')];

    // رفع بيانات الغرفة للسيرفر
    db.ref(`matchmaking/${currentRoomID}`).set({
        status: 'waiting',
        questions: sharedQuestions,
        player1: { id: userData.playerID, name: userData.username, score: 0 }
    });

    setupRealOnlineBar("أنت", "جاري البحث...", 0, 0);

    // إذا قطع الاتصال، احذف الغرفة
    db.ref(`matchmaking/${currentRoomID}`).onDisconnect().remove();

    // الاستماع لدخول اللاعب الثاني
    db.ref(`matchmaking/${currentRoomID}/player2`).on('value', snap => {
        if(snap.exists()) {
            db.ref(`matchmaking/${currentRoomID}`).update({status: 'playing'});
            let p2 = snap.val();
            opponentID = 'player2';
            setupRealOnlineBar("أنت", p2.name, 0, 0);
            startOnlineGamePlay();
        }
    });
}

function joinRandomRoom(roomKey, roomData) {
    // الانضمام كلاعب ثاني
    db.ref(`matchmaking/${roomKey}/player2`).set({
        id: userData.playerID, name: userData.username, score: 0
    });
    
    // في حالة خروجنا نحذف بياناتنا
    db.ref(`matchmaking/${roomKey}/player2`).onDisconnect().remove();

    opponentID = 'player1';
    sharedQuestions = roomData.questions; // أخذ نفس الأسئلة من السيرفر
    
    setupRealOnlineBar("أنت", roomData.player1.name, 0, 0);
    startOnlineGamePlay();
}

function startOnlineGamePlay() {
    document.getElementById('waitingScreen').style.display = 'none';
    document.getElementById('quizBox').style.display = 'flex';
    
    // الاستماع لنقاط الخصم المباشرة
    db.ref(`matchmaking/${currentRoomID}/${opponentID}/score`).on('value', snap => {
        if(snap.exists()) {
            let oppScoreEl = document.getElementById('friendScoreDisplay');
            if(oppScoreEl) oppScoreEl.innerText = snap.val();
        }
    });

    updateMatchUI();
    loadMatchStage();
}

function setupRealOnlineBar(myName, oppName, myScore = 0, oppScore = 0) {
    let html = `
        <div class="online-player me">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.username}">
            <span>${myName}</span><span class="score-badge" id="myScoreDisplay">${myScore}</span>
        </div>
        <div class="online-player">
            <img id="friendAvatar" src="https://api.dicebear.com/7.x/avataaars/svg?seed=${oppName}">
            <span id="friendNameDisplay">${oppName}</span><span class="score-badge" id="friendScoreDisplay">${oppScore}</span>
        </div>
    `;
    document.getElementById('matchPlayersBar').innerHTML = html;
}

// === الدالة المسؤولة عن تحميل المرحلة (معدلة لدعم الأسئلة الموحدة) ===
function loadMatchStage() {
    clearInterval(matchTimer); matchTimeLeft = 15;
    if(currentMatchStage >= 4) { endMatch(); return; }

    const stages = ['A', 'B', 'C', 'D']; const currentType = stages[currentMatchStage]; 
    
    // استخدام الأسئلة الموحدة لو كنا أونلاين، أو أسئلة عشوائية لو ذكاء اصطناعي
    if (matchMode === 'online') {
        currentQData = sharedQuestions[currentMatchStage];
    } else {
        currentQData = getQuestion(currentType);
    }

    document.getElementById('stageIndicator').innerText = `المرحلة ${currentType}`;
    document.getElementById('qImageContainer').style.display = 'none'; document.getElementById('qTextContainer').style.display = 'none'; document.getElementById('matchOptionsContainer').style.display = 'none'; document.getElementById('matchInputContainer').style.display = 'none'; document.getElementById('manualInputAnswer').value = ""; 
    document.getElementById('matchQuestionText').innerText = currentQData.q;

    if(currentType === 'A') renderOptions(currentQData.a, currentQData.c);
    else if(currentType === 'B') { document.getElementById('qImageContainer').style.display = 'block'; document.getElementById('qImage').src = currentQData.img; renderOptions(currentQData.a, currentQData.c); }
    else if(currentType === 'C') { document.getElementById('matchInputContainer').style.display = 'block'; document.getElementById('manualInputAnswer').focus(); }
    else if(currentType === 'D') { document.getElementById('qTextContainer').style.display = 'block'; document.getElementById('qParagraph').innerText = currentQData.text; renderOptions(currentQData.a, currentQData.c); }

    const progress = document.getElementById('matchProgress'); progress.style.width = "100%";
    matchTimer = setInterval(() => { matchTimeLeft--; progress.style.width = (matchTimeLeft / 15) * 100 + "%"; if(matchTimeLeft <= 3 && matchTimeLeft > 0) playSfx('timer'); if(matchTimeLeft <= 0) { playSfx('wrong'); handleAnswer(false); } }, 1000);
}

function renderOptions(arr, correctIdx) {
    const container = document.getElementById('matchOptionsContainer'); container.style.display = 'grid'; container.innerHTML = "";
    arr.forEach((opt, idx) => { let btn = document.createElement('button'); btn.className = "opt-btn"; btn.innerText = opt; btn.onclick = () => handleAnswer(idx === correctIdx); container.appendChild(btn); });
}

function submitManualAnswer() { const val = document.getElementById('manualInputAnswer').value.trim(); if(val === "") return; let isCorrect = val.replace(/[أإآا]/g, "ا") === currentQData.ans.replace(/[أإآا]/g, "ا"); handleAnswer(isCorrect); }

// === الدالة المسؤولة عن الإجابة وتحديث النقاط في السيرفر ===
function handleAnswer(isCorrect) {
    clearInterval(matchTimer);
    if(isCorrect) {
        playSfx('correct'); currentMatchScore += 25;
        let myEl = document.getElementById('myScoreDisplay'); if(myEl) myEl.innerText = currentMatchScore;
        
        // رفع النتيجة للسيرفر ليراها الخصم
        if(matchMode === 'online' && currentRoomID) {
            let myRole = isPlayer1 ? 'player1' : 'player2';
            db.ref(`matchmaking/${currentRoomID}/${myRole}/score`).set(currentMatchScore);
        } else if(matchMode === 'friend' && currentRoomID) { 
            db.ref(`rooms/${currentRoomID}/players/${userData.playerID}/score`).set(currentMatchScore); 
        }
    } else { 
        playSfx('wrong'); 
    }
    
    updateMatchUI(); currentMatchStage++; loadMatchStage();
}

function updateMatchUI() { document.getElementById('matchScoreDisplay').innerText = `نقاط المباراة: ${currentMatchScore}`; }

function endMatch() {
    let finalMessage = "";
    if(currentMatchScore === 100) { 
        userData.coins += 25; userData.points += 20; playSfx('correct'); 
        finalMessage = "🎉 الف مبروك! لقد حصلت على العلامة الكاملة! \n+25 عملة 🪙\n+20 نقطة إنجاز 🏆"; 
    } else { 
        finalMessage = `نهاية المباراة! لقد حصلت على ${currentMatchScore}/100 نقطة. \nحظاً أوفر في المرة القادمة!`; 
    }
    
    // تنظيف الغرف ومستمعي البيانات
    if (matchMode === 'online' && currentRoomID) {
        db.ref(`matchmaking/${currentRoomID}`).off();
        // إزالة الغرفة بعد انتهاء المباراة بـ 3 ثواني لتجنب التراكم في السيرفر
        if(isPlayer1) setTimeout(() => { db.ref(`matchmaking/${currentRoomID}`).remove(); }, 3000);
    } else if (matchMode === 'friend' && currentRoomID) { 
        db.ref(`rooms/${currentRoomID}/players/${userData.playerID}`).remove(); db.ref(`rooms/${currentRoomID}/players`).off(); 
    }
    
    alert(finalMessage);
    updateGlobalUI(); exitToMain();
}

function exitToMain() { 
    playSfx('menu'); clearInterval(matchTimer); 
    
    // الانسحاب أثناء الانتظار أو اللعب يؤدي لحذف الغرفة
    if(matchMode === 'online' && currentRoomID) {
        let myRole = isPlayer1 ? 'player1' : 'player2';
        db.ref(`matchmaking/${currentRoomID}/${myRole}`).remove();
        if(isPlayer1 && currentMatchStage === 0) db.ref(`matchmaking/${currentRoomID}`).remove();
    }
    
    document.getElementById('gameMatchScreen').style.display = 'none'; 
    document.getElementById('mainScreen').style.display = 'flex'; 
    document.getElementById('menuIconBtn').style.display = 'block'; 
}

const titlesData = [ { name: "مبتدئ", req: 0, icon: "🥚" }, { name: "هاوي", req: 100, icon: "🥉" }, { name: "محترف", req: 500, icon: "🥈" }, { name: "خبير", req: 1000, icon: "🥇" }, { name: "أسطورة", req: 5000, icon: "💎" }, { name: "ملك الذكاء", req: 10000, icon: "👑" } ];
function getCurrentTitle() { let current = titlesData[0]; for (let i = 0; i < titlesData.length; i++) if (userData.points >= titlesData[i].req) current = titlesData[i]; return current; }
function updateGlobalUI() { document.getElementById('coinsDisplay').innerText = userData.coins; document.getElementById('pointsDisplay').innerText = userData.points; let currentTitle = getCurrentTitle(); document.getElementById('sideUsername').innerHTML = `${userData.username} <br><small style="color:var(--primary); font-size:0.8rem; font-weight:bold;">[${currentTitle.icon} ${currentTitle.name}]</small>`; document.getElementById('sideID').innerText = userData.playerID; }
updateGlobalUI();

const achievements = []; for(let i = 1; i <= 30; i++) achievements.push({ id: i, name: `تحدي المستوى ${i}`, desc: `احصل على ${i * 100} نقطة إنجاز`, reqPoints: i * 100 });

function toggleMenu(e) { if(e) e.stopPropagation(); playSfx('menu'); const menu = document.getElementById('sideMenu'); const overlay = document.getElementById('sidebarOverlay'); menu.classList.toggle('active'); overlay.style.display = menu.classList.contains('active') ? 'block' : 'none'; }
function closeSidebarOutside(e) { const menu = document.getElementById('sideMenu'); if (menu.classList.contains('active')) { menu.classList.remove('active'); document.getElementById('sidebarOverlay').style.display = 'none'; } }

function openModal(type) {
    playSfx('menu'); const title = document.getElementById('modalTitle'); const body = document.getElementById('modalBody'); document.getElementById('modalOverlay').style.display = 'flex';
    if(document.getElementById('sideMenu').classList.contains('active')) toggleMenu();

    if (type === 'developer') { title.innerText = "حساب المطور 👨‍💻"; body.innerHTML = `<div style="text-align:center; line-height:2.5;"><p><b>الاسم:</b> Baqer Hamed</p><p><b>انستكرام:</b> <a href="https://instagram.com/01s1c" target="_blank" style="color:var(--primary); font-weight:bold; font-size:1.2rem;">01s1c</a></p><p style="color:#888;">الإنشاء: 2026/3/23</p></div>`; } 
    else if (type === 'achievements') { title.innerText = "إنجازات اللعبة 🏅"; let content = `<div class="achievements-list">`; achievements.forEach(ach => { let isUnlocked = userData.points >= ach.reqPoints; content += `<div class="ach-card ${isUnlocked ? 'unlocked' : 'locked'}"><div><b>${ach.name}</b><br><small style="color:#aaa;">${ach.desc}</small></div><div style="font-size:1.5rem;">${isUnlocked ? '🏆' : '🔒'}</div></div>`; }); body.innerHTML = content + `</div>`; }
    else if (type === 'settings') { title.innerText = "الإعدادات ⚙️"; body.innerHTML = `<div style="text-align:right; line-height:2.5;"><label>صوت الموسيقى 🎵</label><input type="range" min="0" max="100" value="${bgMusic.volume * 100}" oninput="updateMusicVol(this.value)" style="width:100%;"><label>مؤثرات اللعبة 🔊</label><input type="range" min="0" max="100" value="${sfxVolumeVal * 100}" oninput="updateSfxVol(this.value)" style="width:100%;"><button onclick="document.body.classList.toggle('dark-mode'); playSfx('menu');" class="premium-btn primary-btn" style="margin-top:10px;">تغيير الوضع 🌓</button></div>`; }
    else if (type === 'help') { title.innerText = "دليل اللعبة ❓"; body.innerHTML = `<div style="line-height:2; font-size:0.9rem; text-align:justify; max-height:400px; overflow-y:auto; padding-right:5px;"><h3 style="color:var(--primary);">نظام المباريات ⚔️</h3><p>المباراة تتكون من 4 مراحل. أجب بشكل صحيح لتنال 25 نقطة.</p></div>`; }
    else if (type === 'admin') { title.innerText = "لوحة التحكم 🛠️"; body.innerHTML = `<div style="display:flex; flex-direction:column; gap:10px;"><button class="premium-btn primary-btn" onclick="playSfx('play'); alert('تم تفعيل أوامر الإدارة!')">لوحة الأوامر 💻</button></div>`; }
    else if (type === 'account') { title.innerText = "الحساب 👤"; body.innerHTML = `<div style="background:rgba(0,0,0,0.3); padding:20px; border-radius:15px; line-height:2;"><p>الاسم: <b>${userData.username}</b></p><p>ID: <b style="color:var(--primary)">${userData.playerID}</b></p></div><button class="premium-btn primary-btn" style="margin-top:15px;" onclick="promptNameChange()">تغيير الاسم</button>`; }
    else if (type === 'store') { title.innerText = "المتجر الملكي 🛒"; let content = `<p style="text-align:center;">رصيدك: 🪙 <b style="color:gold;">${userData.coins}</b></p><div class="grid-store">`; for(let i=0; i<20; i++) { let randID = Math.floor(Math.random() * 89999) + 1000; content += `<div class="store-item"><h3 style="color:var(--primary); margin:0 0 10px 0;">🆔 ${randID}</h3><button class="buy-btn" onclick="playSfx('play'); alert('تم شراء المعرف ${randID}')">💰 500</button></div>`; } body.innerHTML = content + `</div>`; }
    else if (type === 'titles') { title.innerText = "الألقاب 🎖️"; let content = `<div class="titles-list" style="display:flex; flex-direction:column; gap:10px;">`; titlesData.forEach(t => { let isUnl = userData.points >= t.req; let bg = isUnl ? "background:rgba(99,102,241,0.2); border:1px solid var(--primary);" : "background:rgba(0,0,0,0.3); opacity:0.6;"; content += `<div style="${bg} padding:15px; border-radius:15px; display:flex; justify-content:space-between;"><div><span style="font-size:1.5rem;">${t.icon}</span> <b>${t.name}</b></div><div>${isUnl ? "مكتسب ✅" : t.req + " 🔒"}</div></div>`; }); body.innerHTML = content + `</div>`; }
}

function promptNameChange() { playSfx('menu'); let today = new Date().toDateString(); if (userData.lastChangeDate !== today) { userData.nameChangesToday = 0; userData.lastChangeDate = today; } if (userData.nameChangesToday >= 2) return alert("⚠️ استنفدت الحد اليومي!"); let newName = prompt("أدخل الاسم الجديد:"); if (newName && newName.trim().length >= 3) { userData.username = newName.trim(); userData.nameChangesToday++; updateGlobalUI(); openModal('account'); 
    // تحديث الاسم في السيرفر إذا كان داخل غرفة
    if(matchMode === 'friend' && currentRoomID) db.ref(`rooms/${currentRoomID}/players/${userData.playerID}`).update({name: userData.username});
} }
function closeModal() { playSfx('menu'); document.getElementById('modalOverlay').style.display = 'none'; }
