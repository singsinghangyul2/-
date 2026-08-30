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

  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
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
          setAlertMessage(`🍍 ${partnerName}님이 상큼하게 응원의 콕을 보냈어요!`);
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
        alert('🌴 푸켓행 인증 사진이 상큼하게 업로드되었습니다!');
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
      alert(`✨ ${partnerName}님에게 응원의 파도를 보냈어요! 🌊`);
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
      alert('🥗 상큼한 식단 기록이 저장되었습니다!');
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
      alert('💪 활기찬 운동 기록이 저장되었습니다!');
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
    return <div className="flex justify-center items-center h-screen bg-[#FFFDF9] text-[#008B8B] font-black text-base">🌴 푸켓 바다 불러오는 중...</div>;
  }

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto mt-16 p-8 bg-[#FFFDF9] rounded-3xl shadow-xl border-2 border-[#E0F2F1]">
        <div className="text-center mb-6">
          <span className="text-5xl">🍍</span>
          <h2 className="text-[#008B8B] text-2xl font-black mt-2">푸켓행 바디 챌린지</h2>
          <p className="text-[#FF7F50] text-xs font-bold mt-1">✨ 승현 & 상오니의 달콤살벌 커플 다이어트</p>
        </div>
        <form onSubmit={handleAuth} className="flex flex-col gap-3.5">
          <input type="email" placeholder="이메일 주소" value={email} onChange={(e) => setEmail(e.target.value)} required className="p-4 rounded-2xl border-2 border-[#E0F2F1] focus:outline-[#008B8B] text-sm bg-white font-medium" />
          <input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} required className="p-4 rounded-2xl border-2 border-[#E0F2F1] focus:outline-[#008B8B] text-sm bg-white font-medium" />
          <button type="submit" className="p-4 bg-[#008B8B] text-white rounded-2xl font-black hover:bg-[#007373] transition text-sm shadow-md mt-2">{isSignUp ? '🌴 가입하고 떠나기' : '🌊 로그인하기'}</button>
        </form>
        <button onClick={() => setIsSignUp(!isSignUp)} className="bg-transparent border-none text-[#FF7F50] mt-5 w-full font-bold cursor-pointer text-xs">
          {isSignUp ? '이미 계정이 있으신가요? 로그인' : '처음이신가요? 회원가입하기'}
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
    <div className="max-w-md mx-auto pb-28 font-sans bg-[#FFFDF9] min-h-screen relative text-gray-700 shadow-2xl border-x-2 border-[#E0F2F1]">
      
      {alertMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-[#FF7F50] text-white px-5 py-3 rounded-full shadow-xl z-50 font-black text-xs animate-bounce border-2 border-white">
          {alertMessage}
        </div>
      )}

      {/* 상단 헤더 (청록색 바다 컨셉) */}
      <header className="p-4 bg-[#008B8B] text-white flex justify-between items-center shadow-md rounded-b-2xl">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌴</span>
          <h1 className="m-0 text-base font-black tracking-wide">푸켓행 바디 챌린지</h1>
        </div>
        <div className="flex items-center gap-1.5 bg-[#007373] px-3 py-1.5 rounded-full shadow-inner">
          <span className="text-xs">🧳</span>
          <span className="text-xs font-black text-[#FFD700]">{myName}님</span>
        </div>
      </header>

      {/* 메인 컨텐츠 영역 */}
      <main className="p-4">
        {activeTab === 'home' && (
          <div className="space-y-4">
            {/* D-day 카드 (열대 바다 그라데이션 + 파인애플/야자수 무드) */}
            <div className="bg-gradient-to-br from-[#008B8B] via-[#20B2AA] to-[#FF7F50] p-6 rounded-3xl text-white text-center shadow-lg relative overflow-hidden border-2 border-white/40">
              <div className="absolute -right-3 -bottom-3 text-7xl opacity-25">🍍</div>
              <div className="absolute -left-3 -top-3 text-6xl opacity-20">🌴</div>
              <p className="m-0 text-[11px] font-black uppercase tracking-wider text-[#FFD700] drop-shadow-sm">☀️ PHUKET TRIP COUNTDOWN ☀️</p>
              <h2 className="m-2 text-4xl font-black drop-shadow-md">D-{calculateDday()}</h2>
              <p className="m-0 text-xs text-white/90 font-bold">맑고 푸른 야자수 아래의 우리를 위해 오늘도 파이팅! 🌊</p>
            </div>

            {/* 파트너 응원 카드 (산호색 & 노란색 포인트) */}
            <div className="bg-white p-5 rounded-3xl border-2 border-[#E0F2F1] shadow-sm relative">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-black text-[#008B8B] flex items-center gap-1">✨ 응원 타임라인</span>
                <span className="text-xs bg-[#FFF8DC] text-[#D4AF37] px-3 py-1 rounded-full font-black border border-[#FFD700]">누적 벌금: {totalPenalty.toLocaleString()}원</span>
              </div>
              <div className="bg-[#F4F9F9] p-4 rounded-2xl flex items-center justify-between mb-4 border border-[#E0F2F1]">
                <div>
                  <p className="m-0 font-black text-sm text-[#008B8B]">💛 {partnerName}님과 함께 항해 중</p>
                  <p className="m-0 text-[11px] text-gray-500 mt-0.5 font-medium">오늘은 경쟁 말고 서로 달콤하게 응원해 주기!</p>
                </div>
                <span className="text-2xl">🏄‍♂️</span>
              </div>
              <div className="flex gap-2">
                <button onClick={handlePoke} className="flex-1 p-3 bg-[#FF7F50] text-white border-none rounded-2xl font-black cursor-pointer hover:bg-[#FF6347] transition text-xs shadow-md">🥗 식단 응원 콕!</button>
                <button onClick={handlePoke} className="flex-1 p-3 bg-[#32CD32] text-white border-none rounded-2xl font-black cursor-pointer hover:bg-[#228B22] transition text-xs shadow-md">💪 운동 응원 콕!</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div>
            <div className="flex justify-between items-center mb-3 px-1">
              <h2 className="text-base font-black text-[#008B8B] m-0 flex items-center gap-1">📅 커플 열대 달력</h2>
              <div className="flex gap-1.5">
                <button onClick={() => changeMonth(-1)} className="px-3 py-1 bg-white border-2 border-[#008B8B] text-[#008B8B] rounded-xl text-xs font-black cursor-pointer shadow-sm">◀</button>
                <span className="px-3.5 py-1 bg-[#E0F2F1] text-[#008B8B] rounded-xl text-xs font-black flex items-center">{year}.{String(month + 1).padStart(2, '0')}</span>
                <button onClick={() => changeMonth(1)} className="px-3 py-1 bg-white border-2 border-[#008B8B] text-[#008B8B] rounded-xl text-xs font-black cursor-pointer shadow-sm">▶</button>
              </div>
            </div>

            <div className="bg-white p-4 rounded-3xl shadow-sm border-2 border-[#E0F2F1]">
              <div className="grid grid-cols-7 text-center font-black text-xs text-gray-400 mb-3">
                <span className="text-rose-500">일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span className="text-blue-500">토</span>
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: firstDay }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="h-20 bg-gray-50/50 rounded-2xl"></div>
                ))}

                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const formattedMonth = String(month + 1).padStart(2, '0');
                  const formattedDay = String(dayNum).padStart(2, '0');
                  const dateStr = `${year}-${formattedMonth}-${formattedDay}`;

                  const myRec = myRecords.find(r => r.targetDate === dateStr);
                  const partnerRec = partnerRecords.find(r => r.targetDate === dateStr);

                  return (
                    <div key={dateStr} className="h-20 bg-[#F4F9F9] border border-[#E0F2F1] rounded-2xl p-1 flex flex-col justify-between overflow-hidden shadow-2xs">
                      <div className="text-[11px] font-black text-[#008B8B] px-1">{dayNum}</div>
                      <div className="flex flex-col gap-0.5 text-[9px] font-black">
                        <div className={`truncate px-1 py-0.5 rounded text-center ${myRec ? (myRec.status === '성공' ? 'bg-[#E0F2F1] text-[#008B8B]' : myRec.status === '야자수 데이' ? 'bg-[#FFF8DC] text-[#D4AF37]' : 'bg-rose-100 text-rose-700') : 'text-gray-300'}`}>
                          나:{myRec ? (myRec.status === '성공' ? '✅' : myRec.status === '야자수 데이' ? '🌴' : '❌') : '-'}
                        </div>
                        <div className={`truncate px-1 py-0.5 rounded text-center ${partnerRec ? (partnerRec.status === '성공' ? 'bg-[#E0F2F1] text-[#008B8B]' : partnerRec.status === '야자수 데이' ? 'bg-[#FFF8DC] text-[#D4AF37]' : 'bg-rose-100 text-rose-700') : 'text-gray-300'}`}>
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
            <h2 className="text-base font-black text-[#008B8B] m-0 px-1 flex items-center gap-1">📝 상큼한 미션 기록하기</h2>
            
            <div className="bg-white p-5 rounded-3xl border-2 border-[#E0F2F1] shadow-sm">
              <label className="text-xs font-black text-[#008B8B] mb-1.5 block">📅 인증 날짜 선택</label>
              <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="w-full p-3.5 rounded-2xl border-2 border-[#E0F2F1] text-xs bg-[#F4F9F9] font-black text-[#008B8B] mb-4" />

              <form onSubmit={handleSaveDiet} className="space-y-3">
                <h4 className="m-0 text-[#FF7F50] font-black text-xs uppercase flex items-center gap-1">🥗 식단 인증 기록</h4>
                <select value={dietStatus} onChange={(e) => setDietStatus(e.target.value)} className="w-full p-3.5 rounded-2xl border-2 border-[#E0F2F1] font-black text-xs bg-[#F4F9F9] text-gray-700">
                  <option value="성공">성공 완료! ✅</option>
                  <option value="실패">아쉬운 실패 ❌</option>
                  <option value="야자수 데이">야자수 데이 🌴 (달콤한 치팅)</option>
                </select>
                <textarea placeholder="식단 메모 입력 (예: 상큼한 아보카도 샐러드 🥗)" value={dietMemo} onChange={(e) => setDietMemo(e.target.value)} className="w-full p-3.5 rounded-2xl border-2 border-[#E0F2F1] h-20 text-xs resize-none bg-[#F4F9F9] font-medium" />
                
                <div>
                  <label className="text-xs font-black text-gray-600 mb-1 block">📸 인증 사진 파일 업로드</label>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full p-2.5 rounded-2xl border-2 border-[#E0F2F1] text-xs bg-[#F4F9F9] font-bold file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-[#008B8B] file:text-white" />
                  {uploadingImage && <p className="text-xs text-[#008B8B] mt-1 font-bold">열대 바다로 사진 전송 중... 🌊</p>}
                  {dietPhotoUrl && <p className="text-xs text-[#32CD32] mt-1 font-black">✅ 사진 업로드 완료!</p>}
                </div>

                <button type="submit" className="w-full p-3.5 bg-[#008B8B] text-white rounded-2xl font-black hover:bg-[#007373] transition text-xs shadow-md">식단 저장하기 🌴</button>
              </form>
            </div>

            <div className="bg-white p-5 rounded-3xl border-2 border-[#E0F2F1] shadow-sm">
              <form onSubmit={handleSaveWorkout} className="space-y-3">
                <h4 className="m-0 text-[#32CD32] font-black text-xs uppercase flex items-center gap-1">💪 운동 인증 기록 (하루 최대 1회)</h4>
                <input type="text" value={workoutType} onChange={(e) => setWorkoutType(e.target.value)} placeholder="운동 종류" className="w-full p-3.5 rounded-2xl border-2 border-[#E0F2F1] text-xs bg-[#F4F9F9] font-medium" />
                <input type="text" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="운동 시간 (분)" className="w-full p-3.5 rounded-2xl border-2 border-[#E0F2F1] text-xs bg-[#F4F9F9] font-medium" />
                <textarea placeholder="운동 메모" value={workoutMemo} onChange={(e) => setWorkoutMemo(e.target.value)} className="w-full p-3.5 rounded-2xl border-2 border-[#E0F2F1] h-20 text-xs resize-none bg-[#F4F9F9] font-medium" />
                <button type="submit" className="w-full p-3.5 bg-[#32CD32] text-white rounded-2xl font-black hover:bg-[#228B22] transition text-xs shadow-md">운동 완료 저장하기 🔥</button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            <h2 className="text-base font-black text-[#008B8B] m-0 px-1">⚙️ 설정 및 계정 정보</h2>
            <div className="bg-white p-5 rounded-3xl border-2 border-[#E0F2F1] shadow-sm space-y-4">
              <div>
                <p className="m-0 text-xs text-gray-400 font-bold">현재 로그인 계정</p>
                <p className="m-0 text-sm font-black text-[#008B8B] mt-0.5">{currentUser.email}</p>
              </div>
              <button onClick={handleLogout} className="w-full p-3.5 bg-rose-50 text-rose-600 border-2 border-rose-100 rounded-2xl font-black text-xs hover:bg-rose-100 transition">로그아웃하기 🚪</button>
            </div>
          </div>
        )}
      </main>

      {/* 하단 네비게이션 바 (크림빛 배경 + 청록/산호 포인트) */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t-2 border-[#E0F2F1] flex justify-around py-3.5 z-40 shadow-2xl rounded-t-3xl">
        {[
          ['home', '🏠 홈'], 
          ['calendar', '📅 캘린더'], 
          ['record', '📝 기록'], 
          ['settings', '⚙️ 설정']
        ].map(([tab, label]) => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            className={`bg-transparent border-none cursor-pointer text-xs transition flex flex-col items-center gap-1 ${activeTab === tab ? 'text-[#008B8B] scale-110 font-black' : 'text-gray-400 font-bold'}`}
          >
            <span className="text-base">{label.split(' ')[0]}</span>
            <span className="text-[11px]">{label.split(' ')[1]}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}