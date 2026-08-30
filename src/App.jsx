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
        alert('인증 사진이 업로드되었습니다! 📸');
      } else {
        alert('이미지 업로드 실패: ' + (data.error?.message || '알 수 없는 오류'));
      }
    } catch (err) {
      alert('업로드 중 오류 발생: ' + err.message);
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
      alert(`${partnerName}님을 콕 찔렀습니다! 👉`);
    } catch (error) {
      alert('오류 발생: ' + error.message);
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
      alert('식단 기록이 저장되었습니다! 🥗');
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
        completed: true,
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
    return <div className="flex justify-center items-center h-screen bg-[#fdfbf7] text-teal-600 font-bold">로딩 중... 🏝️</div>;
  }

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-3xl shadow-xl border border-teal-100">
        <div className="text-center mb-6">
          <span className="text-4xl">🏝️</span>
          <h2 className="text-teal-700 text-2xl font-black mt-2">푸켓행 바디 챌린지</h2>
          <p className="text-gray-400 text-xs mt-1">승현 & 상오니의 커플 다이어트 관리</p>
        </div>
        <form onSubmit={handleAuth} className="flex flex-col gap-3">
          <input type="email" placeholder="이메일 주소" value={email} onChange={(e) => setEmail(e.target.value)} required className="p-3.5 rounded-xl border border-teal-100 focus:outline-teal-500 text-sm bg-gray-50" />
          <input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} required className="p-3.5 rounded-xl border border-teal-100 focus:outline-teal-500 text-sm bg-gray-50" />
          <button type="submit" className="p-3.5 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition text-sm mt-2">{isSignUp ? '가입하기' : '로그인하기'}</button>
        </form>
        <button onClick={() => setIsSignUp(!isSignUp)} className="bg-transparent border-none text-rose-500 mt-4 w-full font-bold cursor-pointer text-xs">
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
    <div className="max-w-md mx-auto pb-28 font-sans bg-[#fdfbf7] min-h-screen relative text-gray-800 shadow-2xl border-x border-gray-100">
      
      {alertMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-rose-500 text-white px-5 py-3 rounded-full shadow-xl z-50 font-bold text-xs animate-bounce">
          {alertMessage}
        </div>
      )}

      {/* 상단 헤더 */}
      <header className="p-4 bg-teal-600 text-white flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏝️</span>
          <h1 className="m-0 text-base font-black">푸켓행 바디 챌린지</h1>
        </div>
        <span className="text-xs bg-teal-500 px-3 py-1.5 rounded-full font-bold shadow-inner">{myName}님</span>
      </header>

      {/* 메인 컨텐츠 영역 */}
      <main className="p-4">
        {activeTab === 'home' && (
          <div className="space-y-4">
            {/* D-day 카드 */}
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-6 rounded-3xl text-white text-center shadow-lg relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 text-7xl opacity-20">🌴</div>
              <p className="m-0 text-xs font-bold uppercase tracking-wider text-teal-100">Phuket Travel D-Day</p>
              <h2 className="m-1 text-3xl font-black">D-{calculateDday()}</h2>
              <p className="m-0 text-xs text-teal-100 font-medium">야자수 아래의 우리를 상상하며 오늘도 화이팅!</p>
            </div>

            {/* 파트너 상태 및 콕 찌르기 */}
            <div className="bg-white p-5 rounded-3xl border border-teal-50 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-black text-teal-700 uppercase">Partner Status</span>
                <span className="text-xs bg-rose-50 text-rose-600 px-2.5 py-1 rounded-full font-bold">누적 벌금: {totalPenalty.toLocaleString()}원</span>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between mb-4">
                <div>
                  <p className="m-0 font-bold text-sm text-gray-700">❤️ {partnerName}님과 함께 달리는 중</p>
                  <p className="m-0 text-xs text-gray-400 mt-0.5">오늘도 미션 완료 여부를 확인해보세요!</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handlePoke} className="flex-1 p-3 bg-rose-400 text-white border-none rounded-xl font-bold cursor-pointer hover:bg-rose-500 transition text-xs shadow-sm">🥗 식단 콕 찌르기</button>
                <button onClick={handlePoke} className="flex-1 p-3 bg-emerald-500 text-white border-none rounded-xl font-bold cursor-pointer hover:bg-emerald-600 transition text-xs shadow-sm">💪 운동 콕 찌르기</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div>
            <div className="flex justify-between items-center mb-3 px-1">
              <h2 className="text-base font-black text-gray-800 m-0">📅 커플 월간 캘린더</h2>
              <div className="flex gap-1.5">
                <button onClick={() => changeMonth(-1)} className="px-2.5 py-1 bg-white border border-teal-200 text-teal-700 rounded-lg text-xs font-bold cursor-pointer shadow-sm">◀</button>
                <span className="px-3 py-1 bg-teal-50 text-teal-800 rounded-lg text-xs font-black flex items-center">{year}.{String(month + 1).padStart(2, '0')}</span>
                <button onClick={() => changeMonth(1)} className="px-2.5 py-1 bg-white border border-teal-200 text-teal-700 rounded-lg text-xs font-bold cursor-pointer shadow-sm">▶</button>
              </div>
            </div>

            <div className="bg-white p-4 rounded-3xl shadow-sm border border-teal-50">
              <div className="grid grid-cols-7 text-center font-bold text-xs text-gray-400 mb-3">
                <span className="text-rose-500">일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span className="text-blue-500">토</span>
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: firstDay }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="h-20 bg-gray-50/30 rounded-xl"></div>
                ))}

                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const formattedMonth = String(month + 1).padStart(2, '0');
                  const formattedDay = String(dayNum).padStart(2, '0');
                  const dateStr = `${year}-${formattedMonth}-${formattedDay}`;

                  const myRec = myRecords.find(r => r.targetDate === dateStr);
                  const partnerRec = partnerRecords.find(r => r.targetDate === dateStr);

                  return (
                    <div key={dateStr} className="h-20 bg-gray-50/80 border border-gray-100 rounded-xl p-1.5 flex flex-col justify-between overflow-hidden shadow-2xs">
                      <div className="text-[11px] font-black text-gray-600">{dayNum}</div>
                      <div className="flex flex-col gap-0.5 text-[9px] font-bold">
                        <div className={`truncate px-1 py-0.5 rounded text-center ${myRec ? (myRec.status === '성공' ? 'bg-emerald-100 text-emerald-800' : myRec.status === '야자수 데이' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800') : 'text-gray-300'}`}>
                          나:{myRec ? (myRec.status === '성공' ? '✅' : myRec.status === '야자수 데이' ? '🌴' : '❌') : '-'}
                        </div>
                        <div className={`truncate px-1 py-0.5 rounded text-center ${partnerRec ? (partnerRec.status === '성공' ? 'bg-emerald-100 text-emerald-800' : partnerRec.status === '야자수 데이' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800') : 'text-gray-300'}`}>
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
          <div className="space-y-4">
            <h2 className="text-base font-black text-gray-800 m-0 px-1">📝 식단 및 운동 기록 입력</h2>
            
            <div className="bg-white p-4 rounded-3xl border border-teal-50 shadow-sm">
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">대상 날짜 선택</label>
              <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="w-full p-3 rounded-xl border border-teal-100 text-xs bg-gray-50 font-bold text-teal-800 mb-4" />

              <form onSubmit={handleSaveDiet} className="space-y-3">
                <h4 className="m-0 text-teal-700 font-black text-xs uppercase">🥗 식단 인증</h4>
                <select value={dietStatus} onChange={(e) => setDietStatus(e.target.value)} className="w-full p-3 rounded-xl border border-teal-100 font-bold text-xs bg-gray-50">
                  <option value="성공">성공 ✅</option>
                  <option value="실패">실패 ❌</option>
                  <option value="야자수 데이">야자수 데이 🌴 (치팅 예외일)</option>
                </select>
                <textarea placeholder="식단 메모 입력 (예: 닭가슴살 샐러드)" value={dietMemo} onChange={(e) => setDietMemo(e.target.value)} className="w-full p-3 rounded-xl border border-teal-100 h-20 text-xs resize-none bg-gray-50" />
                
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">인증 사진 파일 업로드</label>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full p-2 rounded-xl border border-teal-100 text-xs bg-gray-50 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-teal-50 file:text-teal-700" />
                  {uploadingImage && <p className="text-xs text-teal-600 mt-1 font-bold">이미지 업로드 중...</p>}
                  {dietPhotoUrl && <p className="text-xs text-emerald-600 mt-1 font-bold">✅ 사진 업로드 완료</p>}
                </div>

                <button type="submit" className="w-full p-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition text-xs shadow-sm">식단 저장하기</button>
              </form>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-teal-50 shadow-sm">
              <form onSubmit={handleSaveWorkout} className="space-y-3">
                <h4 className="m-0 text-emerald-600 font-black text-xs uppercase">💪 운동 인증 (하루 최대 1회)</h4>
                <input type="text" value={workoutType} onChange={(e) => setWorkoutType(e.target.value)} placeholder="운동 종류" className="w-full p-3 rounded-xl border border-teal-100 text-xs bg-gray-50" />
                <input type="text" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="운동 시간 (분)" className="w-full p-3 rounded-xl border border-teal-100 text-xs bg-gray-50" />
                <textarea placeholder="운동 메모" value={workoutMemo} onChange={(e) => setWorkoutMemo(e.target.value)} className="w-full p-3 rounded-xl border border-teal-100 h-20 text-xs resize-none bg-gray-50" />
                <button type="submit" className="w-full p-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition text-xs shadow-sm">운동 완료 저장하기 🔥</button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            <h2 className="text-base font-black text-gray-800 m-0 px-1">⚙️ 설정 및 계정</h2>
            <div className="bg-white p-5 rounded-3xl border border-teal-50 shadow-sm space-y-4">
              <div>
                <p className="m-0 text-xs text-gray-400 font-bold">로그인 계정</p>
                <p className="m-0 text-sm font-black text-teal-800 mt-0.5">{currentUser.email}</p>
              </div>
              <button onClick={handleLogout} className="w-full p-3.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl font-bold text-xs hover:bg-rose-100 transition">로그아웃 🚪</button>
            </div>
          </div>
        )}
      </main>

      {/* 하단 네비게이션 바 */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 flex justify-around py-3 z-40 shadow-lg rounded-t-3xl">
        {[
          ['home', '🏠 홈'], 
          ['calendar', '📅 캘린더'], 
          ['record', '📝 기록'], 
          ['settings', '⚙️ 설정']
        ].map(([tab, label]) => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            className={`bg-transparent border-none cursor-pointer text-xs font-bold transition flex flex-col items-center gap-1 ${activeTab === tab ? 'text-teal-600 scale-105 font-black' : 'text-gray-300'}`}
          >
            <span className="text-base">{label.split(' ')[0]}</span>
            <span>{label.split(' ')[1]}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}