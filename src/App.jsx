import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, getDoc, onSnapshot, collection, addDoc, query, where, getDocs 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDyrfuOttJHRI-8BgQvpIlnJtEsbIAW7jo",
  authDomain: "couple-diet-1012.firebaseapp.com",
  projectId: "couple-diet-1012",
  storageBucket: "couple-diet-1012.firebasestorage.app",
  messagingSenderId: "487330133450",
  appId: "1:487330133450:web:e03a5c60538ebcb9964b33"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const sanitizeEmail = (email) => email ? email.trim().toLowerCase().replace(/\./g, '_') : '';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  const [pokeCount, setPokeCount] = useState(0);
  const [alertMessage, setAlertMessage] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const [targetDate, setTargetDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }));
  const [dietStatus, setDietStatus] = useState('성공'); 
  const [dietMemo, setDietMemo] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dietPhotoUrl, setDietPhotoUrl] = useState('');
  
  const [workoutType, setWorkoutType] = useState('헬스/피트니스');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [workoutMemo, setWorkoutMemo] = useState('');
  const [workoutCompleted, setWorkoutCompleted] = useState(true);

  const [myRecords, setMyRecords] = useState([]);
  const [partnerRecords, setPartnerRecords] = useState([]);
  const [penalties, setPenalties] = useState([]);

  // 월 캘린더 상태
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
    return () => unsubscribe();
  }, []);

  const userEmail = currentUser?.email ? currentUser.email.trim().toLowerCase() : '';
  const isSeungHyun = userEmail === 'ysh94335@gmail.com';
  const partnerEmail = isSeungHyun ? 'sang5ny@gmail.com' : 'ysh94335@gmail.com';
  const partnerName = isSeungHyun ? '상오니' : '승현';
  const myName = isSeungHyun ? '승현' : '상오니';

  const sanitizedMyEmailKey = sanitizeEmail(currentUser?.email);
  const sanitizedPartnerEmailKey = sanitizeEmail(partnerEmail);

  const calculateDday = () => {
    const target = new Date('2026-12-31T00:00:00+09:00');
    const todayStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' });
    const today = new Date(todayStr);
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  useEffect(() => {
    if (!currentUser) return;
    const docRef = doc(db, 'challenges', 'couple_poke_data');
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const currentMyPoke = data[sanitizedMyEmailKey] || 0;
        if (currentMyPoke > pokeCount && pokeCount !== 0) {
          setAlertMessage(`🚨 ${partnerName}님이 콕 찔렀어요! 오늘의 미션을 확인해 보세요! 👉`);
          setTimeout(() => setAlertMessage(''), 5000);
        }
        setPokeCount(currentMyPoke);
      } else {
        setDoc(docRef, { [sanitizedMyEmailKey]: 0, [sanitizedPartnerEmailKey]: 0 });
      }
    });

    return () => unsubscribe();
  }, [currentUser, sanitizedMyEmailKey, sanitizedPartnerEmailKey, pokeCount, partnerName]);

  useEffect(() => {
    if (!currentUser) return;
    const fetchRecords = async () => {
      try {
        const myQ = query(collection(db, 'dietCheckins'), where('ownerEmail', '==', currentUser.email));
        const mySnap = await getDocs(myQ);
        const myList = [];
        mySnap.forEach((docSnap) => myList.push({ id: docSnap.id, ...docSnap.data() }));
        setMyRecords(myList);

        const partnerQ = query(collection(db, 'dietCheckins'), where('ownerEmail', '==', partnerEmail));
        const partnerSnap = await getDocs(partnerQ);
        const partnerList = [];
        partnerSnap.forEach((docSnap) => partnerList.push({ id: docSnap.id, ...docSnap.data() }));
        setPartnerRecords(partnerList);

        const pQuery = query(collection(db, 'penalties'), where('ownerEmail', '==', currentUser.email));
        const pSnapshot = await getDocs(pQuery);
        const pList = [];
        pSnapshot.forEach((docSnap) => pList.push(docSnap.data()));
        setPenalties(pList);
      } catch (e) {
        console.error("Fetch error:", e);
      }
    };
    fetchRecords();
  }, [currentUser, activeTab, partnerEmail]);

  // 이미지 파일 업로드 핸들러 (ImgBB 활용)
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('https://api.imgbb.com/1/upload?key=d34465b6f3830c29a8264560d2cf3a61', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        setDietPhotoUrl(data.data.url);
        alert('인증 사진이 성공적으로 업로드되었습니다! 📸');
      } else {
        alert('이미지 업로드 실패: ' + (data.error?.message || '알 수 없는 오류'));
      }
    } catch (err) {
      alert('업로드 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePoke = async () => {
    try {
      const docRef = doc(db, 'challenges', 'couple_poke_data');
      const snap = await getDoc(docRef);
      let currentVal = 0;
      if (snap.exists()) {
        currentVal = snap.data()[sanitizedPartnerEmailKey] || 0;
      }
      await setDoc(docRef, { [sanitizedPartnerEmailKey]: currentVal + 1 }, { merge: true });
      alert(`${partnerName}님을 성공적으로 콕 찔렀습니다! 👉`);
    } catch (error) {
      alert('오류 발생: ' + error.message);
    }
  };

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => { setDeferredPrompt(null); });
    } else {
      alert('브라우저 메뉴에서 [홈 화면에 추가] 또는 [앱 설치]를 선택해 주세요!');
    }
  };

  const handleSaveDiet = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'dietCheckins'), {
        coupleID: 'couple_01',
        ownerEmail: currentUser.email,
        partnerEmail: partnerEmail,
        targetDate: targetDate,
        status: dietStatus,
        memo: dietMemo,
        photoUrls: dietPhotoUrl ? [dietPhotoUrl] : [],
        isLocked: false,
        createdAt: new Date().toISOString()
      });
      alert('식단 기록이 안전하게 저장되었습니다! 🥗');
      setDietMemo('');
      setDietPhotoUrl('');
    } catch (err) {
      alert('저장 실패: ' + err.message);
    }
  };

  const handleSaveWorkout = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'exerciseLogs'), {
        coupleID: 'couple_01',
        ownerEmail: currentUser.email,
        partnerEmail: partnerEmail,
        targetDate: targetDate,
        exerciseType: workoutType,
        durationMinutes: durationMinutes,
        memo: workoutMemo,
        completed: workoutCompleted,
        isLocked: false,
        createdAt: new Date().toISOString()
      });
      alert('운동 기록이 저장되었습니다! 💪');
      setWorkoutMemo('');
    } catch (err) {
      alert('저장 실패: ' + err.message);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      alert('로그인 오류: ' + error.message);
    }
  };

  const handleLogout = async () => { await signOut(auth); };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const changeMonth = (direction) => {
    const newDate = new Date(currentMonthDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentMonthDate(newDate);
  };

  if (loading) {
    return <div className="text-center mt-24 text-lg text-teal-600 font-bold">로딩 중... 🏝️</div>;
  }

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto mt-16 p-8 bg-[#fdfbf7] rounded-3xl shadow-lg border border-teal-100">
        <h2 className="text-center text-teal-700 text-2xl font-black mb-2">🏝️ 푸켓행 바디 챌린지</h2>
        <p className="text-center text-gray-500 text-sm mb-6">승현 & 상오니의 커플 식단 및 운동 미션 관리</p>
        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          <input type="email" placeholder="이메일 주소" value={email} onChange={(e) => setEmail(e.target.value)} required className="p-4 rounded-xl border border-teal-200 focus:outline-teal-500 text-sm" />
          <input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} required className="p-4 rounded-xl border border-teal-200 focus:outline-teal-500 text-sm" />
          <button type="submit" className="p-4 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition text-sm">{isSignUp ? '가입하기' : '로그인하기'}</button>
        </form>
        <button onClick={() => setIsSignUp(!isSignUp)} className="bg-transparent border-none text-coral-500 mt-5 w-full font-bold cursor-pointer text-sm">
          {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
        </button>
      </div>
    );
  }

  const totalPenalty = penalties.reduce((acc, cur) => acc + (cur.amount || 0), 0);
  
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  return (
    <div className="max-w-md mx-auto pb-24 font-sans bg-[#fdfbf7] min-h-screen relative text-gray-800 shadow-xl border-x border-gray-100">
      
      {alertMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-rose-500 text-white px-5 py-3 rounded-full shadow-xl z-50 font-bold text-sm animate-bounce">
          {alertMessage}
        </div>
      )}

      <header className="p-4 bg-teal-600 text-white flex justify-between items-center shadow-md">
        <h3 className="m-0 text-base font-black">푸켓행 바디 챌린지 🏝️</h3>
        <span className="text-xs bg-white/20 px-3 py-1.5 rounded-full font-bold">{myName}님 환영해요!</span>
      </header>

      <main className="p-5">
        {activeTab === 'home' && (
          <div>
            <div className="bg-gradient-to-br from-cyan-50 to-teal-50 p-6 rounded-2xl text-center mb-5 border border-teal-200 shadow-sm">
              <h2 className="m-0 mb-2 text-teal-800 text-2xl font-black">푸켓까지 D-{calculateDday()} 🏝️</h2>
              <p className="m-0 text-teal-600 text-xs font-bold">야자수 아래의 우리를 상상하며 오늘도 파이팅!</p>
            </div>

            <h3 className="text-gray-700 text-sm font-bold mb-3">🏠 {partnerName}의 파트너 상태 카드</h3>
            <div className="bg-white p-5 rounded-2xl mb-4 border border-gray-100 shadow-sm">
              <p className="m-0 mb-3 font-bold text-gray-700 text-sm">❤️ {partnerName}님과 함께 달리는 중</p>
              <div className="flex gap-2">
                <button onClick={handlePoke} className="flex-1 p-3 bg-rose-400 text-white border-none rounded-xl font-bold cursor-pointer hover:bg-rose-500 transition text-xs">🥗 식단 콕 찌르기 👉</button>
                <button onClick={handlePoke} className="flex-1 p-3 bg-emerald-600 text-white border-none rounded-xl font-bold cursor-pointer hover:bg-emerald-700 transition text-xs">💪 운동 콕 찌르기 👉</button>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <p className="m-0 mb-2 font-bold text-gray-700 text-sm">💰 이번 달 누적 벌금 현황</p>
              <p className="m-0 text-rose-600 font-bold text-sm">내 누적 벌금: {totalPenalty.toLocaleString()}원</p>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-black m-0">📅 커플 월간 캘린더</h2>
              <div className="flex gap-1">
                <button onClick={() => changeMonth(-1)} className="px-3 py-1.5 bg-teal-600 text-white border-none rounded-lg text-xs font-bold cursor-pointer">◀ 이전달</button>
                <button onClick={() => changeMonth(1)} className="px-3 py-1.5 bg-teal-600 text-white border-none rounded-lg text-xs font-bold cursor-pointer">다음달 ▶</button>
              </div>
            </div>
            <p className="text-teal-700 font-bold text-xs mb-3 text-center">
              {year}년 {month + 1}월
            </p>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="grid grid-cols-7 text-center font-bold text-xs text-gray-400 mb-2">
                <span className="text-rose-500">일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span className="text-blue-500">토</span>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="h-20 bg-gray-50/50 rounded-lg"></div>
                ))}

                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const formattedMonth = String(month + 1).padStart(2, '0');
                  const formattedDay = String(dayNum).padStart(2, '0');
                  const dateStr = `${year}-${formattedMonth}-${formattedDay}`;

                  const myRec = myRecords.find(r => r.targetDate === dateStr);
                  const partnerRec = partnerRecords.find(r => r.targetDate === dateStr);

                  return (
                    <div key={dateStr} className="h-20 bg-gray-50 border border-gray-100 rounded-lg p-1 flex flex-col justify-between overflow-hidden">
                      <div className="text-[11px] font-bold text-gray-700">{dayNum}</div>
                      <div className="flex flex-col gap-0.5 text-[9px] font-bold">
                        <div className={`truncate px-1 rounded ${myRec ? (myRec.status === '성공' ? 'bg-emerald-100 text-emerald-800' : myRec.status === '야자수 데이' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800') : 'text-gray-300'}`}>
                          나:{myRec ? (myRec.status === '성공' ? '✅' : myRec.status === '야자수 데이' ? '🌴' : '❌') : '-'}
                        </div>
                        <div className={`truncate px-1 rounded ${partnerRec ? (partnerRec.status === '성공' ? 'bg-emerald-100 text-emerald-800' : partnerRec.status === '야자수 데이' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800') : 'text-gray-300'}`}>
                          {partnerName}:{partnerRec ? (partnerRec.status === '성공' ? '✅' : partnerRec.status === '야자수 데이' ? '🌴' : '❌') : '-'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'record' && (
          <div>
            <h2 className="text-lg font-black mb-3">📝 식단 및 운동 기록 입력</h2>
            <div className="mb-4">
              <label className="text-xs font-bold text-gray-600">대상 날짜 선택 (오늘 또는 어제):</label>
              <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="w-full p-3 rounded-xl border border-teal-200 mt-1 text-xs bg-white" />
            </div>

            <form onSubmit={handleSaveDiet} className="bg-white p-4 rounded-2xl mb-4 border border-gray-100 shadow-sm">
              <h4 className="m-0 mb-3 text-teal-700 font-bold text-xs">🥗 식단 기록</h4>
              <select value={dietStatus} onChange={(e) => setDietStatus(e.target.value)} className="w-full p-3 rounded-xl border border-teal-200 mb-3 font-bold text-xs bg-white">
                <option value="성공">성공 ✅</option>
                <option value="실패">실패 ❌</option>
                <option value="야자수 데이">야자수 데이 🌴 (치팅 예외일)</option>
              </select>
              <textarea placeholder="식단 메모 입력 (예: 닭가슴살 샐러드)" value={dietMemo} onChange={(e) => setDietMemo(e.target.value)} className="w-full p-3 rounded-xl border border-teal-200 mb-3 h-20 text-xs resize-none" />
              
              <div className="mb-3">
                <label className="text-xs font-bold text-gray-600 mb-1 block">인증 사진 파일 업로드:</label>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full p-2 rounded-xl border border-teal-200 text-xs bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100" />
                {uploadingImage && <p className="text-xs text-teal-600 mt-1 font-bold">이미지 업로드 중...</p>}
                {dietPhotoUrl && <p className="text-xs text-emerald-600 mt-1 font-bold">✅ 사진 업로드 완료됨</p>}
              </div>

              <button type="submit" className="w-full p-3 bg-teal-600 text-white border-none rounded-xl font-bold cursor-pointer hover:bg-teal-700 transition text-xs">식단 저장하기</button>
            </form>

            <form onSubmit={handleSaveWorkout} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <h4 className="m-0 mb-3 text-emerald-700 font-bold text-xs">💪 운동 기록 (하루 최대 1회 인증)</h4>
              <input type="text" value={workoutType} onChange={(e) => setWorkoutType(e.target.value)} placeholder="운동 종류" className="w-full p-3 rounded-xl border border-emerald-200 mb-3 text-xs" />
              <input type="text" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="운동 시간 (분)" className="w-full p-3 rounded-xl border border-emerald-200 mb-3 text-xs" />
              <textarea placeholder="운동 메모" value={workoutMemo} onChange={(e) => setWorkoutMemo(e.target.value)} className="w-full p-3 rounded-xl border border-emerald-200 mb-3 h-20 text-xs resize-none" />
              <button type="submit" className="w-full p-3 bg-emerald-600 text-white border-none rounded-xl font-bold cursor-pointer hover:bg-emerald-700 transition text-xs">운동 완료 저장하기 🔥</button>
            </form>
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <h2 className="text-lg font-black mb-3">⚙️ 설정 및 앱 관리</h2>
            <p className="text-gray-600 text-xs mb-4">로그인 계정: <b>{currentUser.email}</b></p>
            
            <div className="my-5 p-5 bg-cyan-50 rounded-2xl border border-cyan-200">
              <p className="m-0 mb-3 text-xs font-bold text-cyan-900">📱 스마트폰 홈 화면에 앱 설치하기 (PWA)</p>
              <button onClick={handleInstallClick} className="p-3 bg-teal-600 text-white border-none rounded-xl cursor-pointer font-bold w-full text-xs">앱 설치하기 / 홈에 추가</button>
            </div>

            <button onClick={handleLogout} className="p-4 bg-rose-600 text-white border-none rounded-xl cursor-pointer font-bold w-full text-xs hover:bg-rose-700 transition">로그아웃 🚪</button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 flex justify-around py-3 z-40 shadow-lg">
        {[['home', '🏠 홈'], ['calendar', '📅 캘린더'], ['record', '📝 기록'], ['settings', '⚙️ 설정']].map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`bg-transparent border-none cursor-pointer text-xs font-bold ${activeTab === tab ? 'text-teal-600 scale-105' : 'text-gray-400'}`}>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}