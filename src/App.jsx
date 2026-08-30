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
          setAlertMessage(`🍍 ${partnerName}님이 상큼한 응원을 보냈어요!`);
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
        alert('🌴 인증 사진이 업로드되었습니다!');
      } else {
        alert('업로드 실패: ' + (data.error?.message || '오류 발생'));
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
      alert('🥗 식단 기록이 저장되었습니다!');
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
      alert('💪 운동 기록이 저장되었습니다!');
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
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4FBFB', color: '#008B8B', fontWeight: 'bold', fontSize: '15px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        🌴 푸켓 바다 불러오는 중...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div style={{ maxWidth: '400px', margin: '40px auto', padding: '32px', background: '#FFFFFF', borderRadius: '28px', boxShadow: '0 20px 40px rgba(0, 139, 139, 0.1)', border: '1px solid #E0F2F1', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <span style={{ fontSize: '48px' }}>🍍</span>
          <h2 style={{ color: '#008B8B', fontSize: '24px', fontWeight: '900', margin: '12px 0 4px 0' }}>푸켓행 바디 챌린지</h2>
          <p style={{ color: '#FF7F50', fontSize: '13px', fontWeight: 'bold', margin: 0 }}>✨ 승현 & 상오니의 달콤살벌 커플 다이어트</p>
        </div>
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input type="email" placeholder="이메일 주소" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid #E0F2F1', outline: 'none', fontSize: '14px', background: '#F8FBFB', boxSizing: 'border-box', fontWeight: '500' }} />
          <input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid #E0F2F1', outline: 'none', fontSize: '14px', background: '#F8FBFB', boxSizing: 'border-box', fontWeight: '500' }} />
          <button type="submit" style={{ width: '100%', padding: '16px', background: '#008B8B', color: '#FFFFFF', borderRadius: '16px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '14px', boxShadow: '0 8px 20px rgba(0, 139, 139, 0.25)', marginTop: '8px' }}>
            {isSignUp ? '🌴 가입하고 떠나기' : '🌊 로그인하기'}
          </button>
        </form>
        <button onClick={() => setIsSignUp(!isSignUp)} style={{ background: 'transparent', border: 'none', color: '#FF7F50', marginTop: '20px', width: '100%', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
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
    <div style={{ maxWidth: '420px', margin: '0 auto', paddingBottom: '100px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: '#F4F9F9', minHeight: '100vh', position: 'relative', color: '#2D3748', boxShadow: '0 0 30px rgba(0,0,0,0.08)' }}>
      
      {alertMessage && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: '#FF7F50', color: '#FFFFFF', padding: '12px 20px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(255,127,80,0.3)', zIndex: 1000, fontWeight: 'bold', fontSize: '12px', border: '1px solid rgba(255,255,255,0.4)' }}>
          {alertMessage}
        </div>
      )}

      {/* 상단 헤더 */}
      <header style={{ padding: '18px 24px', background: 'linear-gradient(135deg, #008B8B 0%, #20B2AA 100%)', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 15px rgba(0, 139, 139, 0.2)', borderBottomLeftRadius: '28px', borderBottomRightRadius: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>🌴</span>
          <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '900', letterSpacing: '0.5px' }}>푸켓행 바디 챌린지</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.2)', padding: '6px 14px', borderRadius: '20px', backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.2)' }}>
          <span style={{ fontSize: '12px' }}>🧳</span>
          <span style={{ fontSize: '12px', fontWeight: '900', color: '#FFFDE7' }}>{myName}님</span>
        </div>
      </header>

      {/* 메인 컨텐츠 영역 */}
      <main style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {activeTab === 'home' && (
          <>
            {/* D-day 카드 */}
            <div style={{ background: 'linear-gradient(135deg, #008B8B 0%, #20B2AA 50%, #FF7F50 100%)', padding: '28px 20px', borderRadius: '28px', color: '#FFFFFF', textAlign: 'center', boxShadow: '0 12px 30px rgba(0, 139, 139, 0.25)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', fontSize: '80px', opacity: '0.15' }}>🍍</div>
              <p style={{ margin: 0, fontSize: '11px', fontWeight: '900', letterSpacing: '1px', color: '#FFFDE7' }}>☀️ PHUKET TRIP COUNTDOWN ☀️</p>
              <h2 style={{ margin: '10px 0', fontSize: '42px', fontWeight: '900', textShadow: '0 2px 10px rgba(0,0,0,0.15)' }}>D-{calculateDday()}</h2>
              <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.95)', fontWeight: 'bold' }}>맑고 푸른 야자수 아래의 우리를 위해 오늘도 파이팅! 🌊</p>
            </div>

            {/* 파트너 응원 카드 */}
            <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '28px', border: '1px solid #E0F2F1', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '12px', fontWeight: '900', color: '#008B8B' }}>✨ 응원 타임라인</span>
                <span style={{ fontSize: '11px', background: '#FFF8E1', color: '#F57F17', padding: '4px 12px', borderRadius: '12px', fontWeight: '900', border: '1px solid #FFE082' }}>누적 벌금: {totalPenalty.toLocaleString()}원</span>
              </div>
              <div style={{ background: '#F4F9F9', padding: '16px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', border: '1px solid #E0F2F1' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: '900', fontSize: '13px', color: '#008B8B' }}>💛 {partnerName}님과 함께 항해 중</p>
                  <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#718096', fontWeight: '500' }}>오늘은 경쟁 말고 서로 달콤하게 응원해 주기!</p>
                </div>
                <span style={{ fontSize: '26px' }}>🏄‍♂️</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handlePoke} style={{ flex: 1, padding: '14px', background: '#FF7F50', color: '#FFFFFF', border: 'none', borderRadius: '16px', fontWeight: '900', cursor: 'pointer', fontSize: '12px', boxShadow: '0 6px 15px rgba(255, 127, 80, 0.25)' }}>🥗 식단 응원 콕!</button>
                <button onClick={handlePoke} style={{ flex: 1, padding: '14px', background: '#32CD32', color: '#FFFFFF', border: 'none', borderRadius: '16px', fontWeight: '900', cursor: 'pointer', fontSize: '12px', boxShadow: '0 6px 15px rgba(50, 205, 50, 0.25)' }}>💪 운동 응원 콕!</button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'calendar' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '900', color: '#008B8B', margin: 0 }}>📅 커플 열대 달력</h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button onClick={() => changeMonth(-1)} style={{ width: '30px', height: '30px', background: '#FFFFFF', border: '1px solid #B2DFDB', color: '#008B8B', borderRadius: '10px', fontSize: '12px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>◀</button>
                <span style={{ padding: '6px 12px', background: '#E0F2F1', color: '#008B8B', borderRadius: '10px', fontSize: '12px', fontWeight: '900' }}>{year}.{String(month + 1).padStart(2, '0')}</span>
                <button onClick={() => changeMonth(1)} style={{ width: '30px', height: '30px', background: '#FFFFFF', border: '1px solid #B2DFDB', color: '#008B8B', borderRadius: '10px', fontSize: '12px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>▶</button>
              </div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #E0F2F1' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: '900', fontSize: '12px', color: '#A0AEC0', marginBottom: '12px' }}>
                <span style={{ color: '#E53E3E' }}>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span style={{ color: '#3182CE' }}>토</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                {Array.from({ length: firstDay }).map((_, idx) => (
                  <div key={`empty-${idx}`} style={{ height: '76px', background: '#F7FAFC', borderRadius: '14px' }}></div>
                ))}

                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const formattedMonth = String(month + 1).padStart(2, '0');
                  const formattedDay = String(dayNum).padStart(2, '0');
                  const dateStr = `${year}-${formattedMonth}-${formattedDay}`;

                  const myRec = myRecords.find(r => r.targetDate === dateStr);
                  const partnerRec = partnerRecords.find(r => r.targetDate === dateStr);

                  return (
                    <div key={dateStr} style={{ height: '76px', background: '#F8FBFB', border: '1px solid #E0F2F1', borderRadius: '14px', padding: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
                      <div style={{ fontSize: '11px', fontWeight: '900', color: '#008B8B' }}>{dayNum}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '9px', fontWeight: '900' }}>
                        <div style={{ padding: '2px 4px', borderRadius: '6px', textAlign: 'center', background: myRec ? (myRec.status === '성공' ? '#E0F2F1' : myRec.status === '야자수 데이' ? '#FFF8E1' : '#FFEBEE') : 'transparent', color: myRec ? (myRec.status === '성공' ? '#00695C' : myRec.status === '야자수 데이' ? '#F57F17' : '#C62828') : '#CBD5E0' }}>
                          나:{myRec ? (myRec.status === '성공' ? '✅' : myRec.status === '야자수 데이' ? '🌴' : '❌') : '-'}
                        </div>
                        <div style={{ padding: '2px 4px', borderRadius: '6px', textAlign: 'center', background: partnerRec ? (partnerRec.status === '성공' ? '#E0F2F1' : partnerRec.status === '야자수 데이' ? '#FFF8E1' : '#FFEBEE') : 'transparent', color: partnerRec ? (partnerRec.status === '성공' ? '#00695C' : partnerRec.status === '야자수 데이' ? '#F57F17' : '#C62828') : '#CBD5E0' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '900', color: '#008B8B', margin: 0, paddingLeft: '4px' }}>📝 상큼한 미션 기록하기</h2>
            
            <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '28px', border: '1px solid #E0F2F1', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '900', color: '#008B8B', display: 'block', marginBottom: '8px' }}>📅 인증 날짜 선택</label>
                <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid #B2DFDB', fontSize: '12px', background: '#F8FBFB', fontWeight: '900', color: '#008B8B', boxSizing: 'border-box', outline: 'none' }} />
              </div>

              <form onSubmit={handleSaveDiet} style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '6px' }}>
                <h4 style={{ margin: 0, color: '#FF7F50', fontWeight: '900', fontSize: '12px' }}>🥗 식단 인증 기록</h4>
                <select value={dietStatus} onChange={(e) => setDietStatus(e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid #B2DFDB', fontWeight: 'bold', fontSize: '12px', background: '#F8FBFB', color: '#2D3748', outline: 'none' }}>
                  <option value="성공">성공 완료! ✅</option>
                  <option value="실패">아쉬운 실패 ❌</option>
                  <option value="야자수 데이">야자수 데이 🌴 (달콤한 치팅)</option>
                </select>
                <textarea placeholder="식단 메모 입력 (예: 상큼한 아보카도 샐러드 🥗)" value={dietMemo} onChange={(e) => setDietMemo(e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid #B2DFDB', height: '80px', fontSize: '12px', resize: 'none', background: '#F8FBFB', fontWeight: '500', boxSizing: 'border-box', outline: 'none' }} />
                
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '900', color: '#718096', display: 'block', marginBottom: '6px' }}>📸 인증 사진 파일 업로드</label>
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ width: '100%', padding: '10px', borderRadius: '16px', border: '1px solid #B2DFDB', fontSize: '11px', background: '#F8FBFB', fontWeight: 'bold', boxSizing: 'border-box' }} />
                  {uploadingImage && <p style={{ fontSize: '11px', color: '#008B8B', marginTop: '4px', fontWeight: 'bold' }}>열대 바다로 사진 전송 중... 🌊</p>}
                  {dietPhotoUrl && <p style={{ fontSize: '11px', color: '#32CD32', marginTop: '4px', fontWeight: '900' }}>✅ 사진 업로드 완료!</p>}
                </div>

                <button type="submit" style={{ width: '100%', padding: '14px', background: '#008B8B', color: '#FFFFFF', borderRadius: '16px', fontWeight: '900', border: 'none', cursor: 'pointer', fontSize: '12px', boxShadow: '0 6px 15px rgba(0, 139, 139, 0.25)' }}>식단 저장하기 🌴</button>
              </form>
            </div>

            <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '28px', border: '1px solid #E0F2F1', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <form onSubmit={handleSaveWorkout} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ margin: 0, color: '#32CD32', fontWeight: '900', fontSize: '12px' }}>💪 운동 인증 기록 (하루 최대 1회)</h4>
                <input type="text" value={workoutType} onChange={(e) => setWorkoutType(e.target.value)} placeholder="운동 종류" style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid #C8E6C9', fontSize: '12px', background: '#F8FBFB', fontWeight: '500', boxSizing: 'border-box', outline: 'none' }} />
                <input type="text" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="운동 시간 (분)" style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid #C8E6C9', fontSize: '12px', background: '#F8FBFB', fontWeight: '500', boxSizing: 'border-box', outline: 'none' }} />
                <textarea placeholder="운동 메모" value={workoutMemo} onChange={(e) => setWorkoutMemo(e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid #C8E6C9', height: '80px', fontSize: '12px', resize: 'none', background: '#F8FBFB', fontWeight: '500', boxSizing: 'border-box', outline: 'none' }} />
                <button type="submit" style={{ width: '100%', padding: '14px', background: '#32CD32', color: '#FFFFFF', borderRadius: '16px', fontWeight: '900', border: 'none', cursor: 'pointer', fontSize: '12px', boxShadow: '0 6px 15px rgba(50, 205, 50, 0.25)' }}>운동 완료 저장하기 🔥</button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '900', color: '#008B8B', margin: 0, paddingLeft: '4px' }}>⚙️ 설정 및 계정 정보</h2>
            <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '28px', border: '1px solid #E0F2F1', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <p style={{ margin: 0, fontSize: '11px', color: '#A0AEC0', fontWeight: 'bold' }}>현재 로그인 계정</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', fontWeight: '900', color: '#008B8B' }}>{currentUser.email}</p>
              </div>
              <button onClick={handleLogout} style={{ width: '100%', padding: '14px', background: '#FFF5F5', color: '#E53E3E', border: '1px solid #FED7D7', borderRadius: '16px', fontWeight: '900', fontSize: '12px', cursor: 'pointer' }}>로그아웃하기 🚪</button>
            </div>
          </div>
        )}
      </main>

      {/* 하단 네비게이션 바 */}
      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '420px', background: 'rgba(255, 255, 255, 0.92)', backdropFilter: 'blur(10px)', borderTop: '1px solid #E0F2F1', display: 'flex', justifyContent: 'space-around', padding: '10px 0', zIndex: 900, boxShadow: '0 -10px 25px rgba(0,0,0,0.05)', borderTopLeftRadius: '28px', borderTopRightRadius: '28px' }}>
        {[
          ['home', '🏠 홈'], 
          ['calendar', '📅 캘린더'], 
          ['record', '📝 기록'], 
          ['settings', '⚙️ 설정']
        ].map(([tab, label]) => {
          const isActive = activeTab === tab;
          return (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)} 
              style={{ background: isActive ? '#E0F2F1' : 'transparent', border: 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '8px 16px', borderRadius: '16px', color: isActive ? '#008B8B' : '#A0AEC0', fontWeight: isActive ? '900' : 'bold', transform: isActive ? 'scale(1.05)' : 'scale(1)' }}
            >
              <span style={{ fontSize: '14px' }}>{label.split(' ')[0]}</span>
              <span style={{ fontSize: '10px' }}>{label.split(' ')[1]}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}