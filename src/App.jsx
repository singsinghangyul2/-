import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  doc as firestoreDoc,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDyrfuOttJHRI-8BgQvpIlnJtEsbIAW7jo',
  authDomain: 'couple-diet-1012.firebaseapp.com',
  projectId: 'couple-diet-1012',
  storageBucket: 'couple-diet-1012.firebasestorage.app',
  messagingSenderId: '487330133450',
  appId: '1:487330133450:web:e03a5c60538ebcb9964b33',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const sanitizeEmail = (email) =>
  email ? email.trim().toLowerCase().replace(/\./g, '_') : '';

// 통계 한 줄(라벨-값)을 표시하는 작은 재사용 컴포넌트
function StatRow({ label, value, valueColor }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '7px 0',
        borderBottom: '1px solid #F1F5F9',
      }}
    >
      <span
        style={{
          fontSize: '11px',
          color: '#718096',
          fontWeight: '600',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '12px',
          fontWeight: '900',
          color: valueColor || '#2D3748',
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const [activeTab, setActiveTab] = useState('home');

  const [pokeCount, setPokeCount] = useState(0);
  const [alertMessage, setAlertMessage] = useState('');

  const [targetDate, setTargetDate] = useState(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }),
  );
  const [dietStatus, setDietStatus] = useState('성공');
  const [dietMemo, setDietMemo] = useState('');
  const [uploadingDietImage, setUploadingDietImage] = useState(false);
  const [dietPhotoUrls, setDietPhotoUrls] = useState([]);

  const [workoutType, setWorkoutType] = useState('헬스/피트니스');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [workoutMemo, setWorkoutMemo] = useState('');
  const [uploadingWorkoutImage, setUploadingWorkoutImage] = useState(false);
  const [workoutPhotoUrls, setWorkoutPhotoUrls] = useState([]);

  const [myRecords, setMyRecords] = useState([]);
  const [partnerRecords, setPartnerRecords] = useState([]);
  const [penalties, setPenalties] = useState([]);

  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDateForDetail, setSelectedDateForDetail] = useState(null);

  const [modalImageSrc, setModalImageSrc] = useState(null);
  const [gallerySubTab, setGallerySubTab] = useState('all');

  // -------------------- 인증 상태 --------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const userEmail = currentUser?.email
    ? currentUser.email.trim().toLowerCase()
    : '';
  const isSeungHyun = userEmail === '********@*****.***';
  const partnerEmail = isSeungHyun ? '*******@*****.***' : '********@*****.***';
  const partnerName = isSeungHyun ? '상오니' : '승현';
  const myName = isSeungHyun ? '승현' : '상오니';

  const sanitizedMyEmailKey = sanitizeEmail(currentUser?.email);
  const sanitizedPartnerEmailKey = sanitizeEmail(partnerEmail);

  // -------------------- 디데이 계산 --------------------
  const calculateDday = () => {
    const target = new Date('2026-12-31T00:00:00+09:00');
    const todayStr = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Seoul',
    });
    const today = new Date(todayStr);
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // -------------------- 응원(찌르기) 실시간 --------------------
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
        setDoc(docRef, {
          [sanitizedMyEmailKey]: 0,
          [sanitizedPartnerEmailKey]: 0,
        });
      }
    });

    return () => unsubscribe();
  }, [currentUser, sanitizedMyEmailKey, sanitizedPartnerEmailKey, pokeCount, partnerName]);

  // -------------------- 기록 불러오기 --------------------
  const fetchRecords = async () => {
    if (!currentUser) return;
    try {
      const myQ = query(
        collection(db, 'dietCheckins'),
        where('ownerEmail', '==', currentUser.email),
      );
      const mySnap = await getDocs(myQ);
      const myList = [];
      mySnap.forEach((docSnap) =>
        myList.push({ id: docSnap.id, ...docSnap.data() }),
      );
      setMyRecords(myList);

      const partnerQ = query(
        collection(db, 'dietCheckins'),
        where('ownerEmail', '==', partnerEmail),
      );
      const partnerSnap = await getDocs(partnerQ);
      const partnerList = [];
      partnerSnap.forEach((docSnap) =>
        partnerList.push({ id: docSnap.id, ...docSnap.data() }),
      );
      setPartnerRecords(partnerList);

      const pQuery = query(
        collection(db, 'penalties'),
        where('ownerEmail', '==', currentUser.email),
      );
      const pSnapshot = await getDocs(pQuery);
      const pList = [];
      pSnapshot.forEach((docSnap) => pList.push(docSnap.data()));
      setPenalties(pList);
    } catch (e) {
      console.error('Fetch error:', e);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [currentUser, activeTab, partnerEmail]);

  // -------------------- 이미지 처리 공통 함수 --------------------
  const processImageFiles = (files, setUploading, setUrlsState, currentUrls) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    const newFiles = Array.from(files);
    let processedCount = 0;
    const results = [...currentUrls];

    newFiles.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`'${file.name}' 사진 용량이 10MB를 초과하여 제외되었습니다.`);
        processedCount++;
        if (processedCount === newFiles.length) setUploading(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 1000;
          const MAX_HEIGHT = 1000;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          results.push(dataUrl);

          processedCount++;
          if (processedCount === newFiles.length) {
            setUrlsState(results);
            setUploading(false);
          }
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDietImagesUpload = (e) => {
    processImageFiles(
      e.target.files,
      setUploadingDietImage,
      setDietPhotoUrls,
      dietPhotoUrls,
    );
  };

  const handleWorkoutImagesUpload = (e) => {
    processImageFiles(
      e.target.files,
      setUploadingWorkoutImage,
      setWorkoutPhotoUrls,
      workoutPhotoUrls,
    );
  };

  // -------------------- 응원 보내기 --------------------
  const handlePoke = async () => {
    try {
      const docRef = doc(db, 'challenges', 'couple_poke_data');
      const snap = await getDoc(docRef);
      let currentVal = 0;
      if (snap.exists()) {
        currentVal = snap.data()[sanitizedPartnerEmailKey] || 0;
      }
      await setDoc(
        docRef,
        { [sanitizedPartnerEmailKey]: currentVal + 1 },
        { merge: true },
      );
      alert(`✨ ${partnerName}님에게 응원의 파도를 보냈어요! 🌊`);
    } catch (error) {
      alert('오류 발생: ' + error.message);
    }
  };

  // -------------------- 식단 저장 --------------------
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
        photoUrls: dietPhotoUrls,
        workoutType: '',
        durationMinutes: '',
        workoutMemo: '',
        workoutPhotoUrls: [],
        createdAt: new Date().toISOString(),
      });
      alert('🥗 식단 기록이 저장되었습니다!');
      setDietMemo('');
      setDietPhotoUrls([]);
      fetchRecords();
    } catch (err) {
      alert('저장 실패: ' + err.message);
    }
  };

  // -------------------- 운동 저장 --------------------
  const handleSaveWorkout = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'dietCheckins'), {
        coupleID: 'couple_01',
        ownerEmail: currentUser.email,
        partnerEmail: partnerEmail,
        targetDate: targetDate,
        status: '운동완료',
        memo: workoutMemo,
        photoUrls: [],
        workoutType: workoutType,
        durationMinutes: durationMinutes,
        workoutMemo: workoutMemo,
        workoutPhotoUrls: workoutPhotoUrls,
        createdAt: new Date().toISOString(),
      });
      alert('💪 운동 기록이 저장되었습니다!');
      setWorkoutMemo('');
      setWorkoutPhotoUrls([]);
      fetchRecords();
    } catch (err) {
      alert('저장 실패: ' + err.message);
    }
  };

  // -------------------- 기록 삭제 --------------------
  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm('정말 이 기록을 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(firestoreDoc(db, 'dietCheckins', recordId));
      alert('기록이 삭제되었습니다.');
      setSelectedDateForDetail(null);
      fetchRecords();
    } catch (err) {
      alert('삭제 실패: ' + err.message);
    }
  };

  // -------------------- 로그인/로그아웃 --------------------
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

  const handleLogout = async () => {
    await signOut(auth);
  };

  // -------------------- 달력 관련 유틸 --------------------
  const getDaysInMonth = (year, month) =>
    new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) =>
    new Date(year, month, 1).getDay();

  const changeMonth = (direction) => {
    const newDate = new Date(currentMonthDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentMonthDate(newDate);
  };

  // -------------------- 로딩 / 로그인 화면 --------------------
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: '#F4FBFB',
          color: '#008B8B',
          fontWeight: 'bold',
          fontSize: '15px',
        }}
      >
        🌴 푸켓 바다 불러오는 중...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div
        style={{
          maxWidth: '400px',
          margin: '40px auto',
          padding: '32px',
          background: '#FFFFFF',
          borderRadius: '28px',
          boxShadow: '0 20px 40px rgba(0, 139, 139, 0.1)',
          border: '1px solid #E0F2F1',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <span style={{ fontSize: '48px' }}>🍍</span>
          <h2
            style={{
              color: '#008B8B',
              fontSize: '24px',
              fontWeight: '900',
              margin: '12px 0 4px 0',
            }}
          >
            푸켓행 바디 챌린지
          </h2>
          <p
            style={{
              color: '#FF7F50',
              fontSize: '13px',
              fontWeight: 'bold',
              margin: 0,
            }}
          >
            ✨ 승현 & 상오니의 달콤살벌 커플 다이어트
          </p>
        </div>
        <form
          onSubmit={handleAuth}
          style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          <input
            type="email"
            placeholder="이메일 주소"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '16px',
              border: '1px solid #E0F2F1',
              outline: 'none',
              fontSize: '14px',
              background: '#F8FBFB',
              boxSizing: 'border-box',
              fontWeight: '500',
            }}
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '16px',
              border: '1px solid #E0F2F1',
              outline: 'none',
              fontSize: '14px',
              background: '#F8FBFB',
              boxSizing: 'border-box',
              fontWeight: '500',
            }}
          />
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '16px',
              background: '#008B8B',
              color: '#FFFFFF',
              borderRadius: '16px',
              fontWeight: 'bold',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              boxShadow: '0 8px 20px rgba(0, 139, 139, 0.25)',
              marginTop: '8px',
            }}
          >
            {isSignUp ? '🌴 가입하고 떠나기' : '🌊 로그인하기'}
          </button>
        </form>
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#FF7F50',
            marginTop: '20px',
            width: '100%',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          {isSignUp ? '이미 계정이 있으신가요? 로그인' : '처음이신가요? 회원가입하기'}
        </button>
      </div>
    );
  }

  // -------------------- 로그인 이후 공통 계산 --------------------
  const totalPenalty = penalties.reduce(
    (acc, cur) => acc + (cur.amount || 0),
    0,
  );

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const myRecordForSelectedDate = myRecords.find(
    (r) => r.targetDate === selectedDateForDetail,
  );
  const partnerRecordForSelectedDate = partnerRecords.find(
    (r) => r.targetDate === selectedDateForDetail,
  );

  const allCombinedRecords = [...myRecords, ...partnerRecords].sort(
    (a, b) =>
      new Date(b.targetDate || b.createdAt) -
      new Date(a.targetDate || a.createdAt),
  );

  const todayStr = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Seoul',
  });

  const getTodayDietStatus = (records) => {
    const rec = records.find(
      (r) =>
        r.targetDate === todayStr &&
        r.status &&
        r.status !== '운동완료',
    );
    return rec ? rec.status : '미입력';
  };
  const myTodayDiet = getTodayDietStatus(myRecords);
  const partnerTodayDiet = getTodayDietStatus(partnerRecords);

  const nowForWeek = new Date(todayStr);
  const weekStart = new Date(nowForWeek);
  weekStart.setDate(nowForWeek.getDate() - nowForWeek.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const countWeeklyWorkouts = (records) =>
    records.filter((r) => {
      if (!r.workoutType) return false;
      const d = new Date(r.targetDate);
      return d >= weekStart && d <= weekEnd;
    }).length;

  const myWeeklyWorkoutCount = countWeeklyWorkouts(myRecords);
  const partnerWeeklyWorkoutCount = countWeeklyWorkouts(partnerRecords);

  const calcStreak = (records) => {
    let streak = 0;
    let cursor = new Date(todayStr);
    while (true) {
      const cursorStr = cursor.toLocaleDateString('en-CA');
      const rec = records.find((r) => r.targetDate === cursorStr);
      if (rec && rec.status === '성공') {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }
    return streak;
  };

  const myStreak = calcStreak(myRecords);
  const partnerStreak = calcStreak(partnerRecords);

  // -------------------- 메인 렌더 --------------------
  return (
    <div
      style={{
        maxWidth: '420px',
        margin: '0 auto',
        paddingBottom: '100px',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        background: '#F4F9F9',
        minHeight: '100vh',
        position: 'relative',
        color: '#2D3748',
        boxShadow: '0 0 30px rgba(0,0,0,0.08)',
      }}
    >
      {alertMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#FF7F50',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '16px',
            boxShadow: '0 10px 25px rgba(255,127,80,0.3)',
            zIndex: 1000,
            fontWeight: 'bold',
            fontSize: '12px',
            border: '1px solid rgba(255,255,255,0.4)',
          }}
        >
          {alertMessage}
        </div>
      )}

      {/* 상단 헤더 */}
      <header
        style={{
          padding: '20px 24px 16px 24px',
          background: '#FFFFFF',
          borderBottom: '1px solid #E0E7EE',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                color: '#718096',
                fontWeight: '600',
              }}
            >
              {myName}님, 오늘도 반가워요! 🌴
            </p>
            <h1
              style={{
                margin: '4px 0 0 0',
                fontSize: '20px',
                fontWeight: '900',
                color: '#2D3748',
              }}
            >
              푸켓행 바디 챌린지
            </h1>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#F1F5F9',
              padding: '6px 12px',
              borderRadius: '16px',
            }}
          >
            <span style={{ fontSize: '11px', color: '#718096' }}>로그인</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: '900',
                color: '#008B8B',
                maxWidth: '120px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {currentUser.email}
            </span>
            <button
              onClick={handleLogout}
              style={{
                marginLeft: '4px',
                border: 'none',
                background: 'transparent',
                color: '#CBD5E0',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main
        style={{
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* HOME 탭 */}
        {activeTab === 'home' && (
          <>
            {/* D-day 카드 */}
            <div
              style={{
                background:
                  'linear-gradient(135deg, #FFF9E6 0%, #FFFFFF 100%)',
                padding: '32px 20px',
                borderRadius: '28px',
                textAlign: 'center',
                border: '1px solid #F0EAD6',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#008B8B',
                }}
              >
                푸켓까지
              </p>
              <h2
                style={{
                  margin: '10px 0',
                  fontSize: '52px',
                  fontWeight: '900',
                  color: '#FF7F50',
                }}
              >
                D-{calculateDday()}
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: '12px',
                  color: '#A0AEC0',
                  fontWeight: '600',
                }}
              >
                여행일 · 2026-12-31
              </p>
            </div>

            {/* 오늘의 우리 */}
            <h3
              style={{
                fontSize: '15px',
                fontWeight: '900',
                color: '#2D3748',
                margin: '4px 0 0 4px',
              }}
            >
              오늘의 우리 🏖️
            </h3>

            <div style={{ display: 'flex', gap: '10px' }}>
              {/* 내 카드 */}
              <div
                style={{
                  flex: 1,
                  background: '#FFFFFF',
                  padding: '16px',
                  borderRadius: '20px',
                  border: '2px solid #008B8B',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: '900',
                      color: '#2D3748',
                    }}
                  >
                    {myName}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      background: '#E0F2F1',
                      color: '#008B8B',
                      padding: '3px 10px',
                      borderRadius: '10px',
                      fontWeight: '900',
                    }}
                  >
                    나
                  </span>
                </div>
                <StatRow
                  label="오늘 식단"
                  value={myTodayDiet}
                  valueColor={
                    myTodayDiet === '성공' ? '#008B8B' : '#A0AEC0'
                  }
                />
                <StatRow
                  label="이번 주 운동"
                  value={`${myWeeklyWorkoutCount}회`}
                />
                <StatRow
                  label="연속 성공"
                  value={`${myStreak}일`}
                />
              </div>

              {/* 파트너 카드 */}
              <div
                style={{
                  flex: 1,
                  background: '#FFFFFF',
                  padding: '16px',
                  borderRadius: '20px',
                  border: '1px solid #E0F2F1',
                }}
              >
                <div style={{ marginBottom: '6px' }}>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: '900',
                      color: '#2D3748',
                    }}
                  >
                    {partnerName}
                  </span>
                </div>
                <StatRow
                  label="오늘 식단"
                  value={partnerTodayDiet}
                  valueColor={
                    partnerTodayDiet === '성공'
                      ? '#008B8B'
                      : '#A0AEC0'
                  }
                />
                <StatRow
                  label="이번 주 운동"
                  value={`${partnerWeeklyWorkoutCount}회`}
                />
                <StatRow
                  label="연속 성공"
                  value={`${partnerStreak}일`}
                />
              </div>
            </div>

            {/* 빠른 기록 버튼 */}
            <div
              style={{
                background: '#FFFFFF',
                padding: '16px',
                borderRadius: '20px',
                border: '1px solid #E0F2F1',
              }}
            >
              <h4
                style={{
                  margin: '0 0 12px 4px',
                  fontSize: '13px',
                  fontWeight: '900',
                  color: '#2D3748',
                }}
              >
                빠른 기록
              </h4>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setActiveTab('record')}
                  style={{
                    flex: 1,
                    padding: '16px',
                    background: '#E9F9EF',
                    color: '#2E7D32',
                    border: 'none',
                    borderRadius: '16px',
                    fontWeight: '900',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  🥗 식단 기록
                </button>
                <button
                  onClick={() => setActiveTab('record')}
                  style={{
                    flex: 1,
                    padding: '16px',
                    background: '#E8F4FD',
                    color: '#1565C0',
                    border: 'none',
                    borderRadius: '16px',
                    fontWeight: '900',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  🏃 운동 기록
                </button>
              </div>
            </div>

            {/* 찌르기(응원) 카드 */}
            <div
              style={{
                background: '#FFFFFF',
                padding: '20px',
                borderRadius: '28px',
                border: '1px solid #E0F2F1',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '14px',
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: '900',
                    color: '#008B8B',
                  }}
                >
                  ✨ 응원 타임라인
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    background: '#FFF8E1',
                    color: '#F57F17',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontWeight: '900',
                    border: '1px solid #FFE082',
                  }}
                >
                  누적 벌금: {totalPenalty.toLocaleString()}원
                </span>
              </div>
              <div
                style={{
                  background: '#F4F9F9',
                  padding: '16px',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                  border: '1px solid #E0F2F1',
                }}
              >
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: '900',
                      fontSize: '13px',
                      color: '#008B8B',
                    }}
                  >
                    💛 {partnerName}님과 함께 항해 중
                  </p>
                  <p
                    style={{
                      margin: '3px 0 0 0',
                      fontSize: '11px',
                      color: '#718096',
                      fontWeight: '500',
                    }}
                  >
                    오늘은 경쟁 말고 서로 달콤하게 응원해 주기!
                  </p>
                </div>
                <span style={{ fontSize: '26px' }}>🏄‍♂️</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handlePoke}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: '#FF7F50',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '16px',
                    fontWeight: '900',
                    cursor: 'pointer',
                    fontSize: '12px',
                    boxShadow: '0 6px 15px rgba(255,127,80,0.25)',
                  }}
                >
                  🥗 식단 응원 콕!
                </button>
                <button
                  onClick={handlePoke}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: '#32CD32',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '16px',
                    fontWeight: '900',
                    cursor: 'pointer',
                    fontSize: '12px',
                    boxShadow: '0 6px 15px rgba(50,205,50,0.25)',
                  }}
                >
                  💪 운동 응원 콕!
                </button>
              </div>
            </div>
          </>
        )}

        {/* CALENDAR 탭 */}
        {activeTab === 'calendar' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <button
                onClick={() => changeMonth(-1)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '18px',
                }}
              >
                ◀
              </button>
              <h3
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: '900',
                  color: '#2D3748',
                }}
              >
                {year}년 {month + 1}월
              </h3>
              <button
                onClick={() => changeMonth(1)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '18px',
                }}
              >
                ▶
              </button>
            </div>

            {/* 요일 헤더 */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '4px',
                fontSize: '12px',
                textAlign: 'center',
                marginBottom: '4px',
              }}
            >
              {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
                <div
                  key={d}
                  style={{
                    fontWeight: '700',
                    color:
                      d === '일'
                        ? '#E53E3E'
                        : d === '토'
                        ? '#3182CE'
                        : '#4A5568',
                  }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* 날짜 셀 */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '4px',
              }}
            >
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = new Date(
                  year,
                  month,
                  day,
                ).toLocaleDateString('en-CA', {
                  timeZone: 'Asia/Seoul',
                });

                const myRec = myRecords.find(
                  (r) => r.targetDate === dateStr,
                );
                const partnerRec = partnerRecords.find(
                  (r) => r.targetDate === dateStr,
                );

                const hasSuccess =
                  (myRec && myRec.status === '성공') ||
                  (partnerRec && partnerRec.status === '성공');
                const hasFail =
                  (myRec && myRec.status === '실패') ||
                  (partnerRec && partnerRec.status === '실패');
                const hasWorkout =
                  (myRec && myRec.workoutType) ||
                  (partnerRec && partnerRec.workoutType);

                let bg = '#FFFFFF';
                if (hasSuccess) bg = '#E6FFFA';
                if (hasFail) bg = '#FFE6E6';

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDateForDetail(dateStr)}
                    style={{
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                      padding: '6px 2px',
                      background: bg,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: '700',
                        marginBottom: '2px',
                        color: '#2D3748',
                      }}
                    >
                      {day}
                    </span>
                    <div
                      style={{
                        display: 'flex',
                        gap: '2px',
                        marginBottom: '2px',
                      }}
                    >
                      {hasSuccess && (
                        <span style={{ fontSize: '9px' }}>✅</span>
                      )}
                      {hasFail && (
                        <span style={{ fontSize: '9px' }}>❌</span>
                      )}
                      {hasWorkout && (
                        <span style={{ fontSize: '9px' }}>💪</span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: '9px',
                        color: '#A0AEC0',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {(myRec?.memo || '').slice(0, 4)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* GALLERY 탭 */}
        {activeTab === 'gallery' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', gap: '8px' }}>
              {['all', 'diet', 'workout'].map((key) => (
                <button
                  key={key}
                  onClick={() => setGallerySubTab(key)}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    borderRadius: '16px',
                    border:
                      gallerySubTab === key
                        ? 'none'
                        : '1px solid #E2E8F0',
                    background:
                      gallerySubTab === key ? '#3182CE' : '#FFFFFF',
                    color:
                      gallerySubTab === key ? '#FFFFFF' : '#4A5568',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  {key === 'all'
                    ? '전체'
                    : key === 'diet'
                    ? '식단'
                    : '운동'}
                </button>
              ))}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '4px',
              }}
            >
              {allCombinedRecords
                .filter((rec) => {
                  if (gallerySubTab === 'diet') {
                    return (rec.photoUrls || []).length > 0;
                  }
                  if (gallerySubTab === 'workout') {
                    return (rec.workoutPhotoUrls || []).length > 0;
                  }
                  return (
                    (rec.photoUrls || []).length > 0 ||
                    (rec.workoutPhotoUrls || []).length > 0
                  );
                })
                .flatMap((rec) => {
                  const dietImages = (rec.photoUrls || []).map((url) => ({
                    url,
                    type: 'diet',
                    date: rec.targetDate,
                  }));
                  const workoutImages = (
                    rec.workoutPhotoUrls || []
                  ).map((url) => ({
                    url,
                    type: 'workout',
                    date: rec.targetDate,
                  }));
                  return [...dietImages, ...workoutImages];
                })
                .map((img, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      width: '100%',
                      paddingBottom: '100%',
                      overflow: 'hidden',
                      borderRadius: '8px',
                      background: '#CBD5E0',
                      cursor: 'pointer',
                    }}
                    onClick={() => setModalImageSrc(img.url)}
                  >
                    <img
                      src={img.url}
                      alt=""
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '2px',
                        right: '4px',
                        fontSize: '9px',
                        padding: '1px 3px',
                        borderRadius: '6px',
                        background:
                          img.type === 'diet'
                            ? 'rgba(45, 55, 72, 0.8)'
                            : 'rgba(49, 130, 206, 0.8)',
                        color: '#FFFFFF',
                      }}
                    >
                      {img.type === 'diet' ? '식단' : '운동'}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* RECORD 탭 */}
        {activeTab === 'record' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {/* 날짜 + 식단 */}
            <div
              style={{
                background: '#FFFFFF',
                padding: '16px',
                borderRadius: '20px',
                border: '1px solid #E2E8F0',
              }}
            >
              <div style={{ marginBottom: '8px' }}>
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#4A5568',
                  }}
                >
                  기록 날짜
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '4px',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E0',
                    fontSize: '12px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '8px' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#4A5568',
                  }}
                >
                  식단 상태
                </span>
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '6px',
                  }}
                >
                  {['성공', '실패', '야자수 데이'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setDietStatus(s)}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        borderRadius: '16px',
                        border:
                          dietStatus === s
                            ? 'none'
                            : '1px solid #E2E8F0',
                        background:
                          dietStatus === s ? '#48BB78' : '#FFFFFF',
                        color:
                          dietStatus === s ? '#FFFFFF' : '#4A5568',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '8px' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#4A5568',
                  }}
                >
                  식단 메모
                </span>
                <textarea
                  value={dietMemo}
                  onChange={(e) => setDietMemo(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    marginTop: '4px',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E0',
                    fontSize: '12px',
                    resize: 'vertical',
                  }}
                  placeholder="오늘 식단을 간단히 적어주세요."
                />
              </div>

              <div style={{ marginBottom: '8px' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#4A5568',
                  }}
                >
                  식단 사진
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleDietImagesUpload}
                  style={{
                    display: 'block',
                    marginTop: '4px',
                    fontSize: '11px',
                  }}
                />
                {uploadingDietImage && (
                  <p style={{ fontSize: '11px', marginTop: '4px' }}>
                    압축/업로드 중...
                  </p>
                )}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                    marginTop: '6px',
                  }}
                >
                  {dietPhotoUrls.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt=""
                      style={{
                        width: '60px',
                        height: '60px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                      }}
                      onClick={() => setModalImageSrc(url)}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={handleSaveDiet}
                style={{
                  width: '100%',
                  padding: '10px 0',
                  background: '#48BB78',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '16px',
                  fontWeight: '900',
                  fontSize: '13px',
                  cursor: 'pointer',
                  marginTop: '4px',
                }}
              >
                🥗 식단 기록 저장
              </button>
            </div>

            {/* 운동 기록 */}
            <div
              style={{
                background: '#FFFFFF',
                padding: '16px',
                borderRadius: '20px',
                border: '1px solid #E2E8F0',
              }}
            >
              <div style={{ marginBottom: '8px' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#4A5568',
                  }}
                >
                  운동 종류
                </span>
                <select
                  value={workoutType}
                  onChange={(e) => setWorkoutType(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '4px',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E0',
                    fontSize: '12px',
                  }}
                >
                  <option>헬스/피트니스</option>
                  <option>러닝/조깅</option>
                  <option>수영</option>
                  <option>요가/필라테스</option>
                  <option>기타</option>
                </select>
              </div>

              <div style={{ marginBottom: '8px' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#4A5568',
                  }}
                >
                  운동 시간(분)
                </span>
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '4px',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E0',
                    fontSize: '12px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '8px' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#4A5568',
                  }}
                >
                  운동 메모
                </span>
                <textarea
                  value={workoutMemo}
                  onChange={(e) => setWorkoutMemo(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    marginTop: '4px',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E0',
                    fontSize: '12px',
                    resize: 'vertical',
                  }}
                  placeholder="오늘 운동을 간단히 적어주세요."
                />
              </div>

              <div style={{ marginBottom: '8px' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#4A5568',
                  }}
                >
                  운동 사진
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleWorkoutImagesUpload}
                  style={{
                    display: 'block',
                    marginTop: '4px',
                    fontSize: '11px',
                  }}
                />
                {uploadingWorkoutImage && (
                  <p style={{ fontSize: '11px', marginTop: '4px' }}>
                    압축/업로드 중...
                  </p>
                )}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                    marginTop: '6px',
                  }}
                >
                  {workoutPhotoUrls.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt=""
                      style={{
                        width: '60px',
                        height: '60px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                      }}
                      onClick={() => setModalImageSrc(url)}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={handleSaveWorkout}
                style={{
                  width: '100%',
                  padding: '10px 0',
                  background: '#3182CE',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '16px',
                  fontWeight: '900',
                  fontSize: '13px',
                  cursor: 'pointer',
                  marginTop: '4px',
                }}
              >
                💪 운동 기록 저장
              </button>
            </div>
          </div>
        )}

        {/* SETTINGS 탭 */}
        {activeTab === 'settings' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div
              style={{
                background: '#FFFFFF',
                padding: '16px',
                borderRadius: '20px',
                border: '1px solid #E2E8F0',
              }}
            >
              <h3
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '14px',
                  fontWeight: '900',
                  color: '#2D3748',
                }}
              >
                요약 통계
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: '12px',
                  color: '#4A5568',
                }}
              >
                내 총 기록 수: {myRecords.length}개
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: '12px',
                  color: '#4A5568',
                }}
              >
                파트너 기록 수: {partnerRecords.length}개
              </p>
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '12px',
                  color: '#4A5568',
                }}
              >
                누적 벌금: {totalPenalty.toLocaleString()}원
              </p>
            </div>

            <div
              style={{
                background: '#FFFFFF',
                padding: '16px',
                borderRadius: '20px',
                border: '1px solid #E2E8F0',
              }}
            >
              <h3
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '14px',
                  fontWeight: '900',
                  color: '#2D3748',
                }}
              >
                계정
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: '12px',
                  color: '#4A5568',
                }}
              >
                현재 로그인: {currentUser.email}
              </p>
              <button
                onClick={handleLogout}
                style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#EDF2F7',
                  color: '#4A5568',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                로그아웃
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 날짜 상세 모달 */}
      {selectedDateForDetail && (
        <div
          onClick={() => setSelectedDateForDetail(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '90%',
              maxWidth: '360px',
              maxHeight: '80vh',
              overflowY: 'auto',
              background: '#FFFFFF',
              borderRadius: '18px',
              padding: '16px',
            }}
          >
            {/* 내 기록 카드 */}
            <div
              style={{
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '10px',
                marginBottom: '8px',
              }}
            >
              <h4
                style={{
                  margin: '0 0 4px 0',
                  fontSize: '13px',
                  fontWeight: '900',
                  color: '#2D3748',
                }}
              >
                {myName} 기록
              </h4>
              {myRecordForSelectedDate ? (
                <>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '12px',
                    }}
                  >
                    식단 상태: {myRecordForSelectedDate.status}
                  </p>
                  <p
                    style={{
                      margin: '4px 0 0 0',
                      fontSize: '12px',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    메모: {myRecordForSelectedDate.memo}
                  </p>
                  {(myRecordForSelectedDate.photoUrls || []).length >
                    0 && (
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px',
                        marginTop: '6px',
                      }}
                    >
                      {myRecordForSelectedDate.photoUrls.map(
                        (url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt=""
                            style={{
                              width: '60px',
                              height: '60px',
                              borderRadius: '6px',
                              objectFit: 'cover',
                              cursor: 'pointer',
                            }}
                            onClick={() => setModalImageSrc(url)}
                          />
                        ),
                      )}
                    </div>
                  )}
                  {myRecordForSelectedDate.workoutType && (
                    <p
                      style={{
                        margin: '4px 0 0 0',
                        fontSize: '12px',
                      }}
                    >
                      운동: {myRecordForSelectedDate.workoutType} (
                      {myRecordForSelectedDate.durationMinutes}분)
                    </p>
                  )}
                  {(myRecordForSelectedDate.workoutPhotoUrls || [])
                    .length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px',
                        marginTop: '6px',
                      }}
                    >
                      {myRecordForSelectedDate.workoutPhotoUrls.map(
                        (url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt=""
                            style={{
                              width: '60px',
                              height: '60px',
                              borderRadius: '6px',
                              objectFit: 'cover',
                              cursor: 'pointer',
                            }}
                            onClick={() => setModalImageSrc(url)}
                          />
                        ),
                      )}
                    </div>
                  )}
                  <button
                    onClick={() =>
                      handleDeleteRecord(myRecordForSelectedDate.id)
                    }
                    style={{
                      marginTop: '8px',
                      padding: '6px 10px',
                      borderRadius: '10px',
                      border: 'none',
                      background: '#FED7D7',
                      color: '#C53030',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    이 날짜 내 기록 삭제
                  </button>
                </>
              ) : (
                <p
                  style={{
                    margin: 0,
                    fontSize: '12px',
                    color: '#A0AEC0',
                  }}
                >
                  기록 없음
                </p>
              )}
            </div>

            {/* 파트너 기록 카드 */}
            <div
              style={{
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '10px',
              }}
            >
              <h4
                style={{
                  margin: '0 0 4px 0',
                  fontSize: '13px',
                  fontWeight: '900',
                  color: '#2D3748',
                }}
              >
                {partnerName} 기록
              </h4>
              {partnerRecordForSelectedDate ? (
                <>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '12px',
                    }}
                  >
                    식단 상태: {partnerRecordForSelectedDate.status}
                  </p>
                  <p
                    style={{
                      margin: '4px 0 0 0',
                      fontSize: '12px',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    메모: {partnerRecordForSelectedDate.memo}
                  </p>
                  {(partnerRecordForSelectedDate.photoUrls || [])
                    .length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px',
                        marginTop: '6px',
                      }}
                    >
                      {partnerRecordForSelectedDate.photoUrls.map(
                        (url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt=""
                            style={{
                              width: '60px',
                              height: '60px',
                              borderRadius: '6px',
                              objectFit: 'cover',
                              cursor: 'pointer',
                            }}
                            onClick={() => setModalImageSrc(url)}
                          />
                        ),
                      )}
                    </div>
                  )}
                  {partnerRecordForSelectedDate.workoutType && (
                    <p
                      style={{
                        margin: '4px 0 0 0',
                        fontSize: '12px',
                      }}
                    >
                      운동:{' '}
                      {partnerRecordForSelectedDate.workoutType} (
                      {partnerRecordForSelectedDate.durationMinutes}
                      분)
                    </p>
                  )}
                  {(partnerRecordForSelectedDate.workoutPhotoUrls || [])
                    .length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px',
                        marginTop: '6px',
                      }}
                    >
                      {partnerRecordForSelectedDate.workoutPhotoUrls.map(
                        (url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt=""
                            style={{
                              width: '60px',
                              height: '60px',
                              borderRadius: '6px',
                              objectFit: 'cover',
                              cursor: 'pointer',
                            }}
                            onClick={() => setModalImageSrc(url)}
                          />
                        ),
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p
                  style={{
                    margin: 0,
                    fontSize: '12px',
                    color: '#A0AEC0',
                  }}
                >
                  기록 없음
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 사진 확대 모달 */}
      {modalImageSrc && (
        <div
          onClick={() => setModalImageSrc(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
          }}
        >
          <img
            src={modalImageSrc}
            alt=""
            style={{
              maxWidth: '90%',
              maxHeight: '80%',
              borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            }}
          />
        </div>
      )}

      {/* 하단 네비게이션 바 */}
      <nav
        style={{
          position: 'fixed',
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: '12px',
          width: '100%',
          maxWidth: '420px',
          padding: '8px 12px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            background: '#FFFFFF',
            borderRadius: '999px',
            boxShadow: '0 6px 20px rgba(15,23,42,0.18)',
            overflow: 'hidden',
          }}
        >
          {[
            { key: 'home', label: '홈', icon: '🏝️' },
            { key: 'calendar', label: '캘린더', icon: '📆' },
            { key: 'gallery', label: '갤러리', icon: '🖼️' },
            { key: 'record', label: '기록', icon: '✏️' },
            { key: 'settings', label: '설정', icon: '⚙️' },
          ].map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1,
                  border: 'none',
                  background: active ? '#008B8B' : 'transparent',
                  color: active ? '#FFFFFF' : '#64748B',
                  padding: '6px 0',
                  fontSize: '11px',
                  fontWeight: active ? '800' : '600',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1px',
                }}
              >
                <span style={{ fontSize: '16px' }}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}