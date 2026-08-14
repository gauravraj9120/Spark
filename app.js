/* ==========================================================================
   Spark Dating App - Core Logic and State Management
   ========================================================================== */

// App State Management
let state = {
  user: null, // User profile details
  onboarded: false,
  activeScreen: 'welcome',
  activeTab: 'discover',
  profiles: [], // Mock profiles loaded dynamically
  history: [], // Stack of swiped cards for undo support: { profile, action }
  matches: [], // Matched profiles
  chats: {}, // Chat messages keyed by profile id: [ { sender, text, timestamp } ]
  unreadCount: 0,
  currentCardIndex: 0,
  activeChatProfileId: null,
  isTransitioning: false, // Prevent concurrency issues during swiping animations
  pendingReplyTimers: {}, // Debounce simulated chats
  preferences: {
    maxDistance: 25,
    minAge: 18,
    maxAge: 35,
    theme: 'pink'
  },
  videoCall: {
    active: false,
    connected: false,
    profileId: null,
    duration: 0,
    timerInterval: null,
    audioContext: null,
    ringOscillators: [],
    ringTimeout: null,
    answerTimeout: null,
    captionTimeout: null
  },
  localStream: null, // User webcam stream
  videoMuted: false,
  cameraOff: false
};

// Hybrid Mode Checks
const isBackendMode = window.location.protocol.startsWith('http');
let socket = null;

// Mock Profiles Database (Unsplash High-Quality Portraits used in offline mode)
const mockProfilesDB = [
  {
    id: 'sophia',
    name: 'Sophia',
    age: 24,
    gender: 'female',
    distance: 4,
    bio: 'Wanderlust soul. Photographer & coffee lover. Looking for someone to explore hidden coffee shops and hiking trails with.',
    interests: ['Photography', 'Coffee', 'Hiking', 'Art'],
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=600',
    gallery: [
      'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1513829096999-4978602297f7?auto=format&fit=crop&q=80&w=600'
    ],
    personality: {
      greetings: ["Hey there! I saw you like [INTEREST]. I love that too! Have you done much of it lately?", "Hey! What's your idea of a perfect weekend getaway?"],
      replies: [
        "I just got back from a photoshoot, so tired but it was amazing! What are you up to?",
        "Coffee is definitely my love language. Let's grab a cup sometime?",
        "That sounds wonderful! I'd love to hear more about that.",
        "Haha that is so true! By the way, what kind of music do you listen to?"
      ]
    }
  },
  {
    id: 'marcus',
    name: 'Marcus',
    age: 27,
    gender: 'male',
    distance: 8,
    bio: 'Software engineer by day, fitness enthusiast by night. Always down for travel, coding hackathons, and good street food.',
    interests: ['Tech', 'Coding', 'Fitness', 'Travel'],
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=600',
    gallery: [
      'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1489980508314-941910ded1f4?auto=format&fit=crop&q=80&w=600'
    ],
    personality: {
      greetings: ["Hey! Nice matching with you. I noticed you're into [INTEREST]! What got you started?", "Hey! How's your week treating you?"],
      replies: [
        "I'm working on a new coding side project, it's taking up all my time but I'm close to launching it!",
        "Are you active? I'm hitting the gym later, but down to chat after.",
        "No way, really? That's awesome!",
        "Let's grab some street food sometime and trade tech stories."
      ]
    }
  },
  {
    id: 'elena',
    name: 'Elena',
    age: 26,
    gender: 'female',
    distance: 12,
    bio: 'Music is my escape. Classical pianist but love indie concerts. Wine enthusiast and yoga practitioner.',
    interests: ['Music', 'Cooking', 'Yoga', 'Wine'],
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=600',
    gallery: [
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=600'
    ],
    personality: {
      greetings: ["Hi! It's great to match. You like [INTEREST]? We should definitely chat about that!", "Hello! What kind of music are you listening to right now?"],
      replies: [
        "I'm practicing some new Chopin pieces today. Music is my meditation.",
        "Cooking is a big passion of mine, what's your absolute favorite meal to eat?",
        "Yoga has really helped me stay grounded. Do you do any mindfulness practices?",
        "We should share a bottle of wine sometime and talk about life!"
      ]
    }
  },
  {
    id: 'alex',
    name: 'Alex',
    age: 29,
    gender: 'male',
    distance: 15,
    bio: 'Bookworm & graphic designer. I love retro cinema, mid-century design, and drinking too much pour-over coffee.',
    interests: ['Books', 'Design', 'Cinema', 'Coffee'],
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=600',
    gallery: [
      'https://images.unsplash.com/photo-1500048993953-d23a436266cf?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=600'
    ],
    personality: {
      greetings: ["Hi there. I saw you enjoy [INTEREST] in your profile. That's really interesting! Tell me more?", "Hello. What's the last good book you read or movie you watched?"],
      replies: [
        "I love spending my rainy afternoons in cozy indie bookstores reading design journals.",
        "Design is about how things work, don't you think? That's what drives me.",
        "Pour-over coffee is an art form. I'm slightly obsessed.",
        "That sounds very deep. I like the way you think."
      ]
    }
  },
  {
    id: 'chloe',
    name: 'Chloe',
    age: 23,
    gender: 'female',
    distance: 6,
    bio: 'Fashion designer & contemporary dancer. Life is too short to wear boring clothes. Let\'s dance through the city!',
    interests: ['Fashion', 'Dancing', 'Foodie', 'Travel'],
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
    gallery: [
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?auto=format&fit=crop&q=80&w=600'
    ],
    personality: {
      greetings: ["Hey! Great to match with you. I saw you're interested in [INTEREST]. Is that something you do often?", "Hey! If you could hop on a plane to anywhere right now, where would you go?"],
      replies: [
        "I'm working on my new spring collection today, sketching and sewing away!",
        "Dance is my ultimate expression. It just makes me feel alive, you know?",
        "I'm a total foodie. I know this amazing sushi spot in town, we should go!",
        "Travel is the only thing you buy that makes you richer. What was your last trip?"
      ]
    }
  },
  {
    id: 'liam',
    name: 'Liam',
    age: 28,
    gender: 'male',
    distance: 9,
    bio: 'Singer-songwriter & indie artist. Always seeking beauty in the ordinary. Let\'s go to a gig or an art gallery.',
    interests: ['Music', 'Art', 'Coffee', 'Concerts'],
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600',
    gallery: [
      'https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=600'
    ],
    personality: {
      greetings: ["Hey! Happy to match. I saw you enjoy [INTEREST]! It's so nice to find someone who shares that.", "Hey there! Seen any good live music or art exhibitions lately?"],
      replies: [
        "I'm playing a small acoustic set at a local pub this weekend. A bit nervous but excited!",
        "Art is how we decorate space; music is how we decorate time. Pretty cool, huh?",
        "I love coffee shop acoustic vibes. That's my happy place.",
        "We should check out the new art gallery exhibition next Tuesday!"
      ]
    }
  }
];

// Available Avatars for Onboarding
const availableAvatars = [
  { id: 'u1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200' },
  { id: 'u2', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200' },
  { id: 'u3', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200' },
  { id: 'u4', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200' }
];

// Simulated Captions Database for Video Calls
const videoCaptionsDB = {
  sophia: [
    { text: "Oh, hi! Can you hear me okay? Omg, it's so nice to put a face to the profile!", duration: 4500 },
    { text: "I'm just editing some wedding photoshoot pictures in my studio today. It's super busy!", duration: 5000 },
    { text: "I really love the vibe you have in your bio. We should definitely go shoot some photos together sometime!", duration: 5500 },
    { text: "Wait, someone is at the studio door, I have to run! Let's chat in text later. Bye!", duration: 5000 }
  ],
  marcus: [
    { text: "Yo! What's up? Can you hear me clearly? Awesome, nice to match with you!", duration: 4500 },
    { text: "I'm just debugging a nasty database connection lock. Classic developer life, you know how it is.", duration: 5000 },
    { text: "Your interests looked really cool. We should go grab some craft beer or go bouldering this week?", duration: 5500 },
    { text: "Oh, my local compiler finished building. Catch you later in text, man. Talk soon!", duration: 5000 }
  ],
  elena: [
    { text: "Hi! It's so lovely to meet you. Wow, I'm glad this video call connected successfully!", duration: 4500 },
    { text: "I was practicing some Chopin piano scales, so my fingers are feeling a bit tired.", duration: 5000 },
    { text: "I saw you like classical and live music too. What was your favorite concert experience?", duration: 5500 },
    { text: "Ah, my tea kettle is boiling! I'll catch you later in the message room. Bye-bye!", duration: 5000 }
  ],
  alex: [
    { text: "Hello. It's nice to see you. How has your day been going so far?", duration: 4000 },
    { text: "I'm having a quiet afternoon in the office, drinking tea and doing some UI layout designs.", duration: 5000 },
    { text: "I read your bio and found it very thoughtful. We should discuss cinema and books sometime.", duration: 5500 },
    { text: "Ah, I need to jump on a client review call. Let's continue this in text. Have a good afternoon!", duration: 5000 }
  ],
  chloe: [
    { text: "Hiya! Can you see me? Yay, it works! So good to finally talk to you!", duration: 4000 },
    { text: "I'm currently choosing fabrics for my spring dance collection, everything is so messy!", duration: 5000 },
    { text: "I loved your tags. Let's definitely go out dancing or try that new rooftop restaurant!", duration: 5500 },
    { text: "Oh, my dance instructor is calling my other line. Gotta run, talk to you later, bye!", duration: 4500 }
  ],
  liam: [
    { text: "Hey there! Good to match with you. I hope your day is going well.", duration: 4000 },
    { text: "I'm just tuning my acoustic guitar and writing some chord progressions in my room.", duration: 5000 },
    { text: "You seem like a really cool person. We should check out a live gig or art gallery soon.", duration: 5500 },
    { text: "My bandmates just arrived for practice. Let's keep talking in chat. Take care!", duration: 5000 }
  ]
};

// Helper: Formatter for timestamp
function getFormattedTime() {
  const now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  return hours + ':' + minutes + ' ' + ampm;
}

// State Persistence (Local Storage / Backend Sync Helper)
async function apiFetch(endpoint, method = 'GET', data = null) {
  const options = { method, headers: {} };
  if (data) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data);
  }
  try {
    const response = await fetch(endpoint, options);
    if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`);
    return await response.json();
  } catch (e) {
    console.error(`API Fetch failed for ${endpoint}: `, e);
    throw e;
  }
}

function saveStateToLocalStorage() {
  localStorage.setItem('spark_dating_app_state', JSON.stringify(state));
}

function loadStateFromLocalStorage() {
  const savedState = localStorage.getItem('spark_dating_app_state');
  if (savedState) {
    try {
      const parsed = JSON.parse(savedState);
      state = { ...state, ...parsed };
      state.isTransitioning = false;
      state.pendingReplyTimers = {};
      state.videoCall = {
        active: false,
        connected: false,
        profileId: null,
        duration: 0,
        timerInterval: null,
        audioContext: null,
        ringOscillators: [],
        ringTimeout: null,
        answerTimeout: null,
        captionTimeout: null
      };
      state.localStream = null;
      return true;
    } catch (e) {
      console.error("Failed to parse local storage state, using defaults", e);
    }
  }
  return false;
}

// Initial State Setup
async function initApp() {
  state.isTransitioning = false;
  state.pendingReplyTimers = {};
  
  // Dynamically configure PWA assets only when served via HTTP/HTTPS (prevent file:// errors)
  if (window.location.protocol.startsWith('http')) {
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = 'manifest.json';
      document.head.appendChild(link);
    }
    if (!document.querySelector('meta[name="theme-color"]')) {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = '#ff3c70';
      document.head.appendChild(meta);
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('service-worker.js')
        .then(reg => console.log('Service Worker registered!'))
        .catch(err => console.error('Service Worker registration failed:', err));
    }
  }
  
  if (isBackendMode) {
    try {
      // Sync state from server on startup
      const serverState = await apiFetch('/api/state');
      state = { ...state, ...serverState };
      state.isTransitioning = false;
      state.pendingReplyTimers = {};
      state.videoCall = {
        active: false,
        connected: false,
        profileId: null,
        duration: 0,
        timerInterval: null,
        audioContext: null,
        ringOscillators: [],
        ringTimeout: null,
        answerTimeout: null,
        captionTimeout: null
      };
      state.localStream = null;
      
      // Establish WebSocket Connection
      connectWebSocket();
    } catch (e) {
      console.warn("Failed to contact backend state API, falling back to local storage", e);
      loadStateFromLocalStorage();
    }
  } else {
    loadStateFromLocalStorage();
  }
  
  if (!state.onboarded || !state.user) {
    navigateToScreen('welcome');
  } else {
    setAppTheme(state.preferences.theme);
    navigateToScreen('main');
    if (isBackendMode) {
      await refreshCandidatesBackend();
    } else {
      filterAndLoadProfiles();
    }
    switchTab('discover');
  }
  
  renderOnboardingAvatars();
  updateUnreadBadge();
}

// WebSocket Connection Gateway
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  socket = new WebSocket(wsUrl);
  
  socket.onopen = () => {
    console.log("WebSocket gateway connection established.");
  };
  
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const type = data.type;
      
      if (type === 'message') {
        const profileId = data.profileId;
        const msg = data.message;
        
        if (!state.chats[profileId]) {
          state.chats[profileId] = [];
        }
        
        // Deduplicate messages check
        const exists = state.chats[profileId].some(
          m => m.text === msg.text && m.sender === msg.sender && m.timestamp === msg.timestamp
        );
        
        if (!exists) {
          state.chats[profileId].push(msg);
          
          if (state.activeChatProfileId === profileId) {
            msg.unread = false; // Mark read if open
            renderChatMessages();
          } else {
            updateUnreadBadge();
          }
          saveStateToLocalStorage();
        }
      } else if (type === 'typing') {
        const profileId = data.profileId;
        const status = data.status;
        
        if (state.activeChatProfileId === profileId) {
          showTypingIndicator(status);
        }
      }
    } catch (e) {
      console.error("Error parsing WS message: ", e);
    }
  };
  
  socket.onclose = () => {
    console.warn("WebSocket disconnected. Retrying in 3 seconds...");
    setTimeout(connectWebSocket, 3000);
  };
}

// Navigation between Screens
function navigateToScreen(screenId) {
  state.activeScreen = screenId;
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  const activeScreenEl = document.getElementById(`screen-${screenId}`);
  if (activeScreenEl) {
    activeScreenEl.classList.add('active');
  }
  saveStateToLocalStorage();
}

// Switch Tabs in Main Screen
function switchTab(tabId) {
  state.activeTab = tabId;
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  const activeTabEl = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
  if (activeTabEl) {
    activeTabEl.classList.add('active');
  }
  
  document.querySelectorAll('.tab-view').forEach(view => {
    view.classList.remove('active');
  });
  const activeViewEl = document.getElementById(`view-${tabId}`);
  if (activeViewEl) {
    activeViewEl.classList.add('active');
  }
  
  // Tab-specific rendering
  if (tabId === 'discover') {
    renderCardDeck();
  } else if (tabId === 'chats') {
    renderChatsList();
  } else if (tabId === 'profile') {
    renderProfileSettings();
  }
  
  saveStateToLocalStorage();
}

// Set Theme
async function setAppTheme(themeName) {
  state.preferences.theme = themeName;
  const mockup = document.querySelector('.phone-mockup');
  if (mockup) {
    mockup.className = `phone-mockup theme-${themeName}`;
  }
  
  if (isBackendMode) {
    try {
      await apiFetch('/api/preferences', 'POST', {
        maxDistance: state.preferences.maxDistance,
        maxAge: state.preferences.maxAge,
        theme: themeName
      });
    } catch (e) {
      console.error("Failed to sync theme preference: ", e);
    }
  }
  
  saveStateToLocalStorage();
}

// ==========================================================================
// Onboarding Controller
// ==========================================================================
let selectedAvatarUrl = availableAvatars[0].url;

function renderOnboardingAvatars() {
  const container = document.getElementById('onboarding-avatars');
  if (!container) return;
  container.innerHTML = '';
  
  availableAvatars.forEach(avatar => {
    const option = document.createElement('div');
    option.className = `avatar-option ${avatar.url === selectedAvatarUrl ? 'selected' : ''}`;
    option.innerHTML = `<img src="${avatar.url}" alt="Avatar Option">`;
    option.addEventListener('click', () => {
      document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
      option.classList.add('selected');
      selectedAvatarUrl = avatar.url;
    });
    container.appendChild(option);
  });
}

async function handleOnboardingSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('ob-name').value.trim();
  const age = parseInt(document.getElementById('ob-age').value);
  const bio = document.getElementById('ob-bio').value.trim();
  const gender = document.querySelector('.gender-option.selected')?.dataset.gender || 'female';
  
  // Collect selected interests
  const selectedInterests = [];
  document.querySelectorAll('.interest-tag.selected').forEach(tag => {
    selectedInterests.push(tag.dataset.interest);
  });
  
  if (!name || isNaN(age)) {
    alert("Please enter a valid name and age.");
    return;
  }
  
  state.user = {
    name,
    age,
    bio: bio || "Hey, I am using Spark!",
    gender,
    avatar: selectedAvatarUrl,
    interests: selectedInterests
  };
  state.onboarded = true;
  
  if (isBackendMode) {
    try {
      await apiFetch('/api/onboard', 'POST', state.user);
      await refreshCandidatesBackend();
    } catch (err) {
      console.error("Failed to sync onboarding to backend: ", err);
    }
  } else {
    filterAndLoadProfiles();
  }
  
  navigateToScreen('main');
  switchTab('discover');
}

// ==========================================================================
// Discover & Swiping gesture logic
// ==========================================================================
let isDragging = false;
let startX = 0;
let startY = 0;
let currentX = 0;
let currentY = 0;
let dragCard = null;

function filterAndLoadProfiles() {
  const swipedIds = state.history.map(h => h.profile.id);
  const matchedIds = state.matches.map(m => m.id);
  const excludedIds = [...swipedIds, ...matchedIds];
  
  state.profiles = mockProfilesDB.filter(p => {
    if (excludedIds.includes(p.id)) return false;
    
    const matchesDistance = p.distance <= state.preferences.maxDistance;
    const matchesAge = p.age >= state.preferences.minAge && p.age <= state.preferences.maxAge;
    
    return matchesDistance && matchesAge;
  });
  
  state.currentCardIndex = 0;
}

async function refreshCandidatesBackend() {
  try {
    const candidates = await apiFetch('/api/candidates');
    state.profiles = candidates;
    state.currentCardIndex = 0;
  } catch(e) {
    console.error("Failed to load backend candidates, falling back to local database: ", e);
    filterAndLoadProfiles();
  }
}

function renderCardDeck() {
  const deck = document.getElementById('card-deck');
  const emptyView = document.getElementById('card-deck-empty');
  if (!deck || !emptyView) return;
  
  deck.innerHTML = '';
  
  if (state.currentCardIndex >= state.profiles.length) {
    emptyView.classList.add('active');
    return;
  } else {
    emptyView.classList.remove('active');
  }
  
  const endIndex = Math.min(state.currentCardIndex + 2, state.profiles.length);
  
  for (let i = endIndex - 1; i >= state.currentCardIndex; i--) {
    const profile = state.profiles[i];
    const isTopCard = i === state.currentCardIndex;
    
    const card = document.createElement('div');
    card.className = `profile-card ${isTopCard ? 'top-card' : 'back-card'}`;
    card.dataset.profileId = profile.id;
    
    if (!isTopCard) {
      card.style.transform = 'scale(0.95) translateY(12px)';
      card.style.opacity = '0.85';
      card.style.pointerEvents = 'none';
    }
    
    const tagsMarkup = profile.interests.slice(0, 3).map(interest => 
      `<span class="card-tag">${interest}</span>`
    ).join('');
    
    card.innerHTML = `
      <div class="card-image-container">
        <img class="card-image" src="${profile.image}" alt="${profile.name}">
        <div class="swipe-badge swipe-badge-like">LIKE</div>
        <div class="swipe-badge swipe-badge-nope">NOPE</div>
        <div class="swipe-badge swipe-badge-super">SUPER</div>
        <div class="card-overlay">
          <div class="profile-info">
            <div class="name-age-row">
              <span class="card-name">${profile.name}</span>
              <span class="card-age">${profile.age}</span>
            </div>
            <div class="distance-row">
              <i class="fas fa-map-marker-alt"></i>
              <span>${profile.distance} miles away</span>
            </div>
            <p class="card-bio">${profile.bio}</p>
            <div class="card-tags">
              ${tagsMarkup}
            </div>
          </div>
        </div>
      </div>
    `;
    
    if (isTopCard) {
      attachCardGestureListeners(card);
      card.addEventListener('click', (e) => {
        if (Math.abs(currentX - startX) > 5 || Math.abs(currentY - startY) > 5) {
          return;
        }
        openProfileDetails(profile);
      });
    }
    
    deck.appendChild(card);
  }
}

function attachCardGestureListeners(card) {
  dragCard = card;
  card.addEventListener('mousedown', dragStart);
  card.addEventListener('touchstart', dragStart, { passive: true });
}

function removeCardGestureListeners() {
  if (!dragCard) return;
  dragCard.removeEventListener('mousedown', dragStart);
  dragCard.removeEventListener('touchstart', dragStart);
  
  window.removeEventListener('mousemove', dragMove);
  window.removeEventListener('mouseup', dragEnd);
  window.removeEventListener('touchmove', dragMove);
  window.removeEventListener('touchend', dragEnd);
  
  dragCard = null;
}

function dragStart(e) {
  if (state.isTransitioning) return;
  isDragging = true;
  dragCard.style.transition = 'none';
  
  const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
  const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
  
  startX = clientX;
  startY = clientY;
  currentX = clientX;
  currentY = clientY;
  
  window.addEventListener('mousemove', dragMove);
  window.addEventListener('mouseup', dragEnd);
  window.addEventListener('touchmove', dragMove, { passive: false });
  window.addEventListener('touchend', dragEnd);
}

function dragMove(e) {
  if (!isDragging || !dragCard) return;
  
  const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
  const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
  
  currentX = clientX;
  currentY = clientY;
  
  const deltaX = currentX - startX;
  const deltaY = currentY - startY;
  
  const rotateDeg = deltaX / 12;
  dragCard.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) rotate(${rotateDeg}deg)`;
  
  dragCard.classList.remove('swiping-left', 'swiping-right', 'swiping-up');
  
  if (deltaY < -60 && Math.abs(deltaX) < Math.abs(deltaY)) {
    dragCard.classList.add('swiping-up');
  } else if (deltaX > 40) {
    dragCard.classList.add('swiping-right');
  } else if (deltaX < -40) {
    dragCard.classList.add('swiping-left');
  }
  
  const backCard = document.querySelector('.back-card');
  if (backCard) {
    const progress = Math.min(Math.max(Math.abs(deltaX), Math.abs(deltaY)) / 150, 1);
    const scale = 0.95 + (progress * 0.05);
    const translateY = 12 - (progress * 12);
    const opacity = 0.85 + (progress * 0.15);
    backCard.style.transform = `scale(${scale}) translateY(${translateY}px)`;
    backCard.style.opacity = `${opacity}`;
  }
  
  if (e.cancelable) {
    e.preventDefault();
  }
}

function dragEnd(e) {
  if (!isDragging || !dragCard) return;
  isDragging = false;
  
  window.removeEventListener('mousemove', dragMove);
  window.removeEventListener('mouseup', dragEnd);
  window.removeEventListener('touchmove', dragMove);
  window.removeEventListener('touchend', dragEnd);
  
  const deltaX = currentX - startX;
  const deltaY = currentY - startY;
  const threshold = 110;
  
  dragCard.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
  dragCard.classList.remove('swiping-left', 'swiping-right', 'swiping-up');
  
  if (deltaX > threshold) {
    swipeCardOut('right');
  } else if (deltaX < -threshold) {
    swipeCardOut('left');
  } else if (deltaY < -threshold && Math.abs(deltaX) < Math.abs(deltaY)) {
    swipeCardOut('up');
  } else {
    dragCard.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';
    
    const backCard = document.querySelector('.back-card');
    if (backCard) {
      backCard.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
      backCard.style.transform = 'scale(0.95) translateY(12px)';
      backCard.style.opacity = '0.85';
    }
  }
}

function swipeCardOut(direction) {
  if (state.isTransitioning) return;
  state.isTransitioning = true;
  
  const profile = state.profiles[state.currentCardIndex];
  const card = dragCard;
  
  if (direction === 'right') {
    card.classList.add('swipe-out-right');
    handleCardSwipeAction(profile, 'like');
  } else if (direction === 'left') {
    card.classList.add('swipe-out-left');
    handleCardSwipeAction(profile, 'nope');
  } else if (direction === 'up') {
    card.classList.add('swipe-out-up');
    handleCardSwipeAction(profile, 'super');
  }
  
  removeCardGestureListeners();
  
  setTimeout(() => {
    state.currentCardIndex++;
    state.isTransitioning = false; // Release lock
    renderCardDeck();
  }, 350);
}

function triggerButtonSwipe(action) {
  if (state.isTransitioning) return;
  if (state.currentCardIndex >= state.profiles.length) return;
  
  const profile = state.profiles[state.currentCardIndex];
  const card = document.querySelector('.profile-card.top-card');
  if (!card) return;
  
  state.isTransitioning = true;
  card.style.transition = 'transform 0.5s ease, opacity 0.5s ease';
  
  if (action === 'like') {
    card.classList.add('swipe-out-right');
    handleCardSwipeAction(profile, 'like');
  } else if (action === 'nope') {
    card.classList.add('swipe-out-left');
    handleCardSwipeAction(profile, 'nope');
  } else if (action === 'super') {
    card.classList.add('swipe-out-up');
    handleCardSwipeAction(profile, 'super');
  }
  
  removeCardGestureListeners();
  
  setTimeout(() => {
    state.currentCardIndex++;
    state.isTransitioning = false; // Release lock
    renderCardDeck();
  }, 400);
}

async function handleCardSwipeAction(profile, action) {
  state.history.push({ profile, action });
  
  if (isBackendMode) {
    try {
      const res = await apiFetch('/api/swipe', 'POST', { profileId: profile.id, action });
      if (res.matched) {
        if (!state.matches.find(m => m.id === profile.id)) {
          state.matches.unshift(profile);
          state.chats[profile.id] = []; // init chat locally
        }
        setTimeout(() => {
          triggerMatchCelebration(profile);
        }, 500);
      }
    } catch(err) {
      console.error("Failed to swipe on backend: ", err);
    }
  } else {
    // Offline local simulation
    if (action === 'like' || action === 'super') {
      const matchChance = action === 'super' ? 0.7 : 0.45;
      if (Math.random() < matchChance) {
        // Add to matches state
        if (!state.matches.find(m => m.id === profile.id)) {
          state.matches.unshift(profile);
        }
        setTimeout(() => {
          triggerMatchCelebration(profile);
        }, 500);
      }
    }
  }
  saveStateToLocalStorage();
}

async function handleUndoSwipe() {
  if (state.isTransitioning) return;
  if (state.history.length === 0) return;
  
  state.isTransitioning = true;
  let undoneAction = null;
  
  if (isBackendMode) {
    try {
      const res = await apiFetch('/api/undo', 'POST');
      if (res.success) {
        undoneAction = { profile: res.profile, action: res.action };
        
        // Remove from matches locally
        const matchIndex = state.matches.findIndex(m => m.id === res.profile.id);
        if (matchIndex > -1) {
          state.matches.splice(matchIndex, 1);
          delete state.chats[res.profile.id];
          updateUnreadBadge();
        }
      }
    } catch (err) {
      console.error("Failed to execute backend undo: ", err);
    }
  } else {
    // Offline Undo flow
    const lastAction = state.history.pop();
    undoneAction = lastAction;
    
    const matchIndex = state.matches.findIndex(m => m.id === lastAction.profile.id);
    if (matchIndex > -1) {
      state.matches.splice(matchIndex, 1);
      delete state.chats[lastAction.profile.id];
      if (state.pendingReplyTimers && state.pendingReplyTimers[lastAction.profile.id]) {
        clearTimeout(state.pendingReplyTimers[lastAction.profile.id]);
        delete state.pendingReplyTimers[lastAction.profile.id];
      }
      updateUnreadBadge();
    }
  }
  
  if (!undoneAction) {
    state.isTransitioning = false;
    return;
  }
  
  const profile = undoneAction.profile;
  state.profiles.splice(state.currentCardIndex, 0, profile);
  renderCardDeck();
  
  setTimeout(() => {
    const topCard = document.querySelector('.profile-card.top-card');
    if (topCard) {
      topCard.style.transition = 'none';
      
      let startPos = '-120%, 30px';
      let startRot = '-20deg';
      if (undoneAction.action === 'like') {
        startPos = '120%, 30px';
        startRot = '20deg';
      } else if (undoneAction.action === 'super') {
        startPos = '0, -120%';
        startRot = '0deg';
      }
      
      topCard.style.transform = `translate(${startPos}) rotate(${startRot})`;
      topCard.offsetHeight; // force repaint
      
      topCard.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.15)';
      topCard.style.transform = 'translate(0, 0) rotate(0deg)';
      
      setTimeout(() => {
        state.isTransitioning = false;
      }, 400);
    } else {
      state.isTransitioning = false;
    }
  }, 20);
  
  saveStateToLocalStorage();
}

// ==========================================================================
// Bottom Sheet Profile Info Slider
// ==========================================================================
function openProfileDetails(profile) {
  const sheet = document.getElementById('profile-details-sheet');
  if (!sheet) return;
  
  sheet.querySelector('.details-name').innerText = profile.name;
  sheet.querySelector('.details-age').innerText = profile.age;
  sheet.querySelector('.details-distance').innerText = `${profile.distance} miles away`;
  sheet.querySelector('.details-bio').innerText = profile.bio;
  
  const interestsContainer = sheet.querySelector('.details-interests');
  interestsContainer.innerHTML = profile.interests.map(interest => 
    `<span class="interest-tag selected" style="cursor:default">${interest}</span>`
  ).join('');
  
  const gallery = sheet.querySelector('.details-gallery');
  gallery.innerHTML = '';
  
  const allImages = [profile.image, ...(profile.gallery || [])];
  allImages.forEach(imgUrl => {
    const item = document.createElement('div');
    item.className = 'gallery-img-wrapper';
    item.innerHTML = `<img src="${imgUrl}" alt="Gallery Picture">`;
    gallery.appendChild(item);
  });
  
  sheet.classList.add('active');
}

function closeProfileDetails() {
  const sheet = document.getElementById('profile-details-sheet');
  if (sheet) {
    sheet.classList.remove('active');
  }
}

// ==========================================================================
// Match Celebration Overlay Logic
// ==========================================================================
let currentMatchedProfile = null;

function triggerMatchCelebration(profile) {
  currentMatchedProfile = profile;
  
  if (navigator.vibrate) {
    navigator.vibrate([100, 50, 100]);
  }
  
  document.getElementById('match-avatar-user-img').src = state.user.avatar;
  document.getElementById('match-avatar-matched-img').src = profile.image;
  
  const overlay = document.getElementById('match-overlay');
  overlay.classList.add('active');
  
  createConfettiParticles();
  saveStateToLocalStorage();
}

function closeMatchOverlay() {
  document.getElementById('match-overlay').classList.remove('active');
  currentMatchedProfile = null;
}

function handleSendMessageFromMatch() {
  const profile = currentMatchedProfile;
  closeMatchOverlay();
  switchTab('chats');
  
  setTimeout(() => {
    openChatConversation(profile.id);
  }, 300);
}

function createConfettiParticles() {
  const overlay = document.getElementById('match-overlay');
  if (!overlay) return;
  
  for (let i = 0; i < 40; i++) {
    const particle = document.createElement('div');
    particle.style.position = 'absolute';
    particle.style.width = Math.random() * 8 + 5 + 'px';
    particle.style.height = Math.random() * 12 + 6 + 'px';
    particle.style.backgroundColor = ['#ff3c70', '#ff6f43', '#7b31ff', '#c431ff', '#ffc629', '#00f2fe'][Math.floor(Math.random() * 6)];
    particle.style.top = '40%';
    particle.style.left = '50%';
    particle.style.borderRadius = '2px';
    particle.style.zIndex = '5';
    
    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 8 + 4;
    let xSpeed = Math.cos(angle) * velocity;
    let ySpeed = Math.sin(angle) * velocity - 3;
    
    overlay.appendChild(particle);
    
    let xPos = 0;
    let yPos = 0;
    
    const anim = setInterval(() => {
      xPos += xSpeed;
      yPos += ySpeed;
      ySpeed += 0.25; // gravity
      xSpeed *= 0.98; // drag
      
      particle.style.transform = `translate3d(${xPos}px, ${yPos}px, 0) rotate(${xPos * 2}deg)`;
      
      if (yPos > window.innerHeight / 2) {
        clearInterval(anim);
        particle.remove();
      }
    }, 16);
  }
}

// ==========================================================================
// Chats list and simulated conversational bot engine
// ==========================================================================
function renderChatsList() {
  const matchesQueue = document.getElementById('matches-queue');
  const chatList = document.getElementById('conversation-list');
  if (!matchesQueue || !chatList) return;
  
  matchesQueue.innerHTML = '';
  chatList.innerHTML = '';
  
  if (state.matches.length === 0) {
    matchesQueue.parentElement.style.display = 'none';
    chatList.innerHTML = `
      <div style="text-align:center; padding: 40px 20px; color: var(--text-muted);">
        <i class="far fa-heart" style="font-size: 32px; color: var(--primary-color); margin-bottom: 12px;"></i>
        <h4 style="color:#fff; margin-bottom: 6px;">No Matches Yet</h4>
        <p style="font-size:12px; line-height: 1.5;">Swipe right on profiles! Once they like you back, they'll show up here.</p>
      </div>
    `;
    return;
  }
  
  matchesQueue.parentElement.style.display = 'block';
  
  state.matches.forEach(match => {
    if (!state.chats[match.id] || state.chats[match.id].length === 0) {
      const el = document.createElement('div');
      el.className = 'queue-item';
      el.innerHTML = `
        <div class="queue-avatar-wrapper">
          <img src="${match.image}" alt="${match.name}">
        </div>
        <span class="queue-name">${match.name}</span>
      `;
      el.addEventListener('click', () => openChatConversation(match.id));
      matchesQueue.appendChild(el);
    }
  });
  
  if (matchesQueue.children.length === 0) {
    matchesQueue.parentElement.style.display = 'none';
  }
  
  let hasConvs = false;
  state.matches.forEach(match => {
    const messages = state.chats[match.id];
    if (messages && messages.length > 0) {
      hasConvs = true;
      const lastMsg = messages[messages.length - 1];
      const unreadCount = messages.filter(m => m.sender === 'bot' && m.unread).length;
      
      const item = document.createElement('div');
      item.className = 'conversation-item';
      item.innerHTML = `
        <div class="conv-avatar-wrapper">
          <img src="${match.image}" alt="${match.name}">
          <div class="status-indicator status-online"></div>
        </div>
        <div class="conv-details">
          <div class="conv-header-row">
            <span class="conv-name">${match.name}</span>
            <span class="conv-time">${lastMsg.timestamp}</span>
          </div>
          <div class="conv-msg-row">
            <p class="conv-preview ${unreadCount > 0 ? 'unread' : ''}">${lastMsg.sender === 'user' ? 'You: ' : ''}${lastMsg.text}</p>
            ${unreadCount > 0 ? `<span class="conv-unread-count">${unreadCount}</span>` : ''}
          </div>
        </div>
      `;
      item.addEventListener('click', () => openChatConversation(match.id));
      chatList.appendChild(item);
    }
  });
  
  if (!hasConvs) {
    chatList.innerHTML = `
      <div style="text-align:center; padding: 30px; color: var(--text-muted); font-size:13px;">
        Tap on any match above to start chatting!
      </div>
    `;
  }
}

function openChatConversation(profileId) {
  const profile = state.matches.find(m => m.id === profileId);
  if (!profile) return;
  
  state.activeChatProfileId = profileId;
  
  document.getElementById('chat-room-avatar').src = profile.image;
  document.getElementById('chat-room-name').innerText = profile.name;
  
  const chatInput = document.getElementById('chat-input');
  
  if (state.chats[profileId]) {
    state.chats[profileId].forEach(m => {
      if (m.sender === 'bot') m.unread = false;
    });
    chatInput.disabled = false;
  } else {
    state.chats[profileId] = [];
    chatInput.disabled = true; // lock input during initial greeting
    if (isBackendMode) {
      // Backend automatically queues bot_greeting_task on swipe match
      // So here we just wait for it. If WS is connected, it will arrive.
      // But let's enable input after 1.5s just in case.
      setTimeout(() => {
        chatInput.disabled = false;
      }, 1500);
    } else {
      triggerBotGreeting(profile);
    }
  }
  
  renderChatMessages();
  updateUnreadBadge();
  
  const chatRoom = document.getElementById('screen-chat-room');
  chatRoom.classList.add('active');
}

function closeChatConversation() {
  document.getElementById('screen-chat-room').classList.remove('active');
  state.activeChatProfileId = null;
  renderChatsList();
}

function renderChatMessages() {
  const container = document.getElementById('chat-messages-area');
  if (!container) return;
  
  container.innerHTML = '';
  
  const messages = state.chats[state.activeChatProfileId] || [];
  
  messages.forEach(msg => {
    const bubble = document.createElement('div');
    if (msg.sender === 'system') {
      bubble.className = 'chat-system-message';
      bubble.innerHTML = `<span>${msg.text}</span>`;
    } else {
      bubble.className = `chat-bubble ${msg.sender === 'user' ? 'chat-bubble-sent' : 'chat-bubble-received'}`;
      bubble.innerHTML = `
        <span>${msg.text}</span>
        <div class="chat-time">${msg.timestamp}</div>
      `;
    }
    container.appendChild(bubble);
  });
  
  const typing = document.getElementById('chat-typing-indicator');
  if (typing) {
    container.appendChild(typing);
  }
  
  container.scrollTop = container.scrollHeight;
}

async function handleSendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  
  const messages = state.chats[state.activeChatProfileId];
  if (!messages || messages.length === 0) return;
  
  input.value = '';
  
  const newMsg = {
    sender: 'user',
    text,
    timestamp: getFormattedTime(),
    unread: false
  };
  
  if (isBackendMode) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      // WS Real-time sync
      socket.send(JSON.stringify({
        type: 'message',
        profileId: state.activeChatProfileId,
        text: text
      }));
    } else {
      // REST API fallback
      try {
        messages.push(newMsg);
        renderChatMessages();
        await apiFetch('/api/chat/send', 'POST', {
          profileId: state.activeChatProfileId,
          text: text
        });
      } catch (err) {
        console.error("Failed to send message over REST fallback: ", err);
      }
    }
  } else {
    // Offline simulator
    messages.push(newMsg);
    renderChatMessages();
    triggerBotReply();
  }
  saveStateToLocalStorage();
}

function triggerBotGreeting(profile) {
  const messages = state.chats[profile.id];
  let greetingText = "";
  const commonInterests = profile.interests.filter(i => state.user.interests.includes(i));
  
  if (commonInterests.length > 0) {
    const matchInterest = commonInterests[0];
    greetingText = profile.personality.greetings[0].replace('[INTEREST]', matchInterest);
  } else {
    greetingText = profile.personality.greetings[1];
  }
  
  showTypingIndicator(true);
  
  if (!state.pendingReplyTimers) state.pendingReplyTimers = {};
  
  state.pendingReplyTimers[profile.id] = setTimeout(() => {
    showTypingIndicator(false);
    delete state.pendingReplyTimers[profile.id];
    
    messages.push({
      sender: 'bot',
      text: greetingText,
      timestamp: getFormattedTime(),
      unread: state.activeChatProfileId !== profile.id
    });
    
    if (state.activeChatProfileId === profile.id) {
      const chatInput = document.getElementById('chat-input');
      if (chatInput) {
        chatInput.disabled = false;
        chatInput.focus();
      }
      renderChatMessages();
    } else {
      updateUnreadBadge();
    }
    saveStateToLocalStorage();
  }, 1200);
}

function triggerBotReply() {
  const profileId = state.activeChatProfileId;
  const profile = state.matches.find(m => m.id === profileId);
  const messages = state.chats[profileId];
  
  if (!state.pendingReplyTimers) state.pendingReplyTimers = {};
  
  if (state.pendingReplyTimers[profileId]) {
    clearTimeout(state.pendingReplyTimers[profileId]);
  }
  
  showTypingIndicator(true);
  
  const replies = profile.personality.replies;
  const replyText = replies[Math.floor(Math.random() * replies.length)];
  
  const delay = Math.random() * 1500 + 1500;
  
  state.pendingReplyTimers[profileId] = setTimeout(() => {
    showTypingIndicator(false);
    delete state.pendingReplyTimers[profileId];
    
    if (messages) {
      messages.push({
        sender: 'bot',
        text: replyText,
        timestamp: getFormattedTime(),
        unread: state.activeChatProfileId !== profileId
      });
      
      if (state.activeChatProfileId === profileId) {
        renderChatMessages();
      } else {
        updateUnreadBadge();
      }
      saveStateToLocalStorage();
    }
  }, delay);
}

function showTypingIndicator(show) {
  const typing = document.getElementById('chat-typing-indicator');
  const container = document.getElementById('chat-messages-area');
  if (!typing || !container) return;
  
  typing.style.display = show ? 'flex' : 'none';
  container.scrollTop = container.scrollHeight;
}

function updateUnreadBadge() {
  let unread = 0;
  Object.keys(state.chats).forEach(id => {
    unread += state.chats[id].filter(m => m.sender === 'bot' && m.unread).length;
  });
  state.unreadCount = unread;
  
  const badge = document.getElementById('chats-tab-badge');
  if (badge) {
    if (unread > 0) {
      badge.innerText = unread;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }
}

function handleChatsSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  const items = document.querySelectorAll('.conversation-item');
  
  items.forEach(item => {
    const name = item.querySelector('.conv-name').innerText.toLowerCase();
    const preview = item.querySelector('.conv-preview').innerText.toLowerCase();
    
    if (name.includes(query) || preview.includes(query)) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
}

// ==========================================================================
// Simulated Video Calling Actions
// ==========================================================================
function synthesizeRingtone() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();
    state.videoCall.audioContext = ctx;
    
    function playRingPulse() {
      if (!state.videoCall.active || state.videoCall.connected) return;
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.value = 440;
      osc2.type = 'sine';
      osc2.frequency.value = 480;
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime + 1.8);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.0);
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
      
      state.videoCall.ringOscillators = [osc1, osc2];
      
      setTimeout(() => {
        try {
          osc1.stop();
          osc2.stop();
        } catch(e) {}
        if (state.videoCall.active && !state.videoCall.connected) {
          state.videoCall.ringTimeout = setTimeout(playRingPulse, 2000);
        }
      }, 2000);
    }
    
    playRingPulse();
  } catch (e) {
    console.error("Web Audio API blocked or not supported: ", e);
  }
}

function stopRingtone() {
  if (state.videoCall.ringTimeout) {
    clearTimeout(state.videoCall.ringTimeout);
    state.videoCall.ringTimeout = null;
  }
  if (state.videoCall.ringOscillators) {
    state.videoCall.ringOscillators.forEach(osc => {
      try { osc.stop(); } catch(e) {}
    });
    state.videoCall.ringOscillators = [];
  }
  if (state.videoCall.audioContext) {
    try {
      state.videoCall.audioContext.close();
    } catch(e) {}
    state.videoCall.audioContext = null;
  }
}

function startVideoCall(profileId) {
  const profile = state.matches.find(m => m.id === profileId);
  if (!profile) return;
  
  state.videoCall = {
    active: true,
    connected: false,
    profileId: profileId,
    duration: 0,
    timerInterval: null,
    audioContext: null,
    ringOscillators: [],
    ringTimeout: null,
    answerTimeout: null,
    captionTimeout: null
  };
  
  state.videoMuted = false;
  state.cameraOff = false;
  
  document.getElementById('video-calling-name').innerText = profile.name;
  document.getElementById('video-calling-avatar').src = profile.image;
  document.getElementById('video-remote-feed').src = profile.image;
  
  document.getElementById('btn-video-mute').classList.remove('muted');
  document.getElementById('btn-video-mute').innerHTML = '<i class="fas fa-microphone"></i>';
  document.getElementById('btn-video-camera').classList.remove('muted');
  document.getElementById('btn-video-camera').innerHTML = '<i class="fas fa-video"></i>';
  
  const overlay = document.getElementById('video-call-overlay');
  overlay.classList.add('active');
  overlay.classList.remove('connected');
  
  synthesizeRingtone();
  
  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
      state.localStream = stream;
      const videoEl = document.getElementById('user-webcam-feed');
      videoEl.srcObject = stream;
      videoEl.style.display = 'block';
      document.getElementById('user-avatar-fallback').style.display = 'none';
    })
    .catch(err => {
      console.warn("Local webcam access denied or unavailable: ", err);
      const fallbackImg = document.getElementById('user-avatar-fallback');
      fallbackImg.src = state.user.avatar;
      fallbackImg.style.display = 'block';
      document.getElementById('user-webcam-feed').style.display = 'none';
    });
    
  state.videoCall.answerTimeout = setTimeout(() => {
    connectVideoCall(profile);
  }, 2500);
}

function connectVideoCall(profile) {
  state.videoCall.connected = true;
  stopRingtone();
  
  const overlay = document.getElementById('video-call-overlay');
  overlay.classList.add('connected');
  
  const timerEl = document.getElementById('video-call-timer');
  timerEl.innerText = "00:00";
  
  state.videoCall.timerInterval = setInterval(() => {
    state.videoCall.duration++;
    const mins = Math.floor(state.videoCall.duration / 60).toString().padStart(2, '0');
    const secs = (state.videoCall.duration % 60).toString().padStart(2, '0');
    timerEl.innerText = `${mins}:${secs}`;
  }, 1000);
  
  const captions = videoCaptionsDB[profile.id] || [];
  const captionsEl = document.getElementById('video-call-captions');
  captionsEl.innerText = "";
  captionsEl.style.display = 'none';
  
  function showCaptionItem(index) {
    if (!state.videoCall.active || !state.videoCall.connected) return;
    if (index >= captions.length) {
      endVideoCall();
      return;
    }
    
    const item = captions[index];
    captionsEl.innerText = `${profile.name}: "${item.text}"`;
    captionsEl.style.display = 'block';
    
    state.videoCall.captionTimeout = setTimeout(() => {
      captionsEl.style.display = 'none';
      state.videoCall.captionTimeout = setTimeout(() => {
        showCaptionItem(index + 1);
      }, 1000);
    }, item.duration);
  }
  
  showCaptionItem(0);
}

async function endVideoCall() {
  if (!state.videoCall.active) return;
  
  stopRingtone();
  
  if (state.videoCall.answerTimeout) clearTimeout(state.videoCall.answerTimeout);
  if (state.videoCall.timerInterval) clearInterval(state.videoCall.timerInterval);
  if (state.videoCall.captionTimeout) clearTimeout(state.videoCall.captionTimeout);
  
  if (state.localStream) {
    state.localStream.getTracks().forEach(track => track.stop());
    state.localStream = null;
  }
  const videoEl = document.getElementById('user-webcam-feed');
  if (videoEl) videoEl.srcObject = null;
  
  const profileId = state.videoCall.profileId;
  const messages = state.chats[profileId];
  const durationSec = state.videoCall.duration;
  
  let systemText = "";
  if (durationSec === 0) {
    systemText = "📹 Missed video call";
  } else {
    const mins = Math.floor(durationSec / 60);
    const secs = durationSec % 60;
    systemText = `📹 Video call ended (${mins}:${secs.toString().padStart(2, '0')})`;
  }
  
  const systemMsg = {
    sender: 'system',
    text: systemText,
    timestamp: getFormattedTime()
  };
  
  if (isBackendMode) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      // WS Send System Log Message
      socket.send(JSON.stringify({
        type: 'message',
        profileId: profileId,
        text: systemText
      }));
    } else {
      // REST Send System Log Message Fallback
      try {
        if (messages) messages.push(systemMsg);
        renderChatMessages();
        await apiFetch('/api/chat/send', 'POST', {
          profileId: profileId,
          text: systemText
        });
      } catch (err) {
        console.error("Failed to post system call logs over REST: ", err);
      }
    }
  } else {
    // Offline simulation logger
    if (messages) {
      messages.push(systemMsg);
      renderChatMessages();
    }
  }
  
  state.videoCall.active = false;
  state.videoCall.connected = false;
  
  const overlay = document.getElementById('video-call-overlay');
  overlay.classList.remove('active', 'connected');
  
  saveStateToLocalStorage();
}

function toggleVideoMute() {
  if (!state.videoCall.active || !state.localStream) return;
  state.videoMuted = !state.videoMuted;
  
  state.localStream.getAudioTracks().forEach(track => {
    track.enabled = !state.videoMuted;
  });
  
  const muteBtn = document.getElementById('btn-video-mute');
  if (state.videoMuted) {
    muteBtn.classList.add('muted');
    muteBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
  } else {
    muteBtn.classList.remove('muted');
    muteBtn.innerHTML = '<i class="fas fa-microphone"></i>';
  }
}

function toggleVideoCamera() {
  if (!state.videoCall.active) return;
  state.cameraOff = !state.cameraOff;
  
  if (state.localStream) {
    state.localStream.getVideoTracks().forEach(track => {
      track.enabled = !state.cameraOff;
    });
  }
  
  const camBtn = document.getElementById('btn-video-camera');
  const videoEl = document.getElementById('user-webcam-feed');
  const fallbackImg = document.getElementById('user-avatar-fallback');
  
  if (state.cameraOff) {
    camBtn.classList.add('muted');
    camBtn.innerHTML = '<i class="fas fa-video-slash"></i>';
    videoEl.style.display = 'none';
    fallbackImg.src = state.user.avatar;
    fallbackImg.style.display = 'block';
  } else {
    camBtn.classList.remove('muted');
    camBtn.innerHTML = '<i class="fas fa-video"></i>';
    if (state.localStream) {
      videoEl.style.display = 'block';
      fallbackImg.style.display = 'none';
    } else {
      fallbackImg.style.display = 'block';
    }
  }
}

// ==========================================================================
// User Profile & Settings Screen Layout
// ==========================================================================
function renderProfileSettings() {
  if (!state.user) return;
  
  document.getElementById('profile-img-preview').src = state.user.avatar;
  document.getElementById('profile-name-age').innerText = `${state.user.name}, ${state.user.age}`;
  document.getElementById('profile-bio-summary').innerText = state.user.bio;
  
  document.getElementById('pref-distance').value = state.preferences.maxDistance;
  document.getElementById('distance-val').innerText = `${state.preferences.maxDistance} miles`;
  
  document.getElementById('pref-age').value = state.preferences.maxAge;
  document.getElementById('age-val').innerText = `${state.preferences.maxAge} years`;
  
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.remove('selected');
    if (btn.dataset.theme === state.preferences.theme) {
      btn.classList.add('selected');
    }
  });
}

async function handleDistancePreferenceChange(e) {
  const val = e.target.value;
  document.getElementById('distance-val').innerText = `${val} miles`;
  state.preferences.maxDistance = parseInt(val);
  
  if (isBackendMode) {
    try {
      await apiFetch('/api/preferences', 'POST', {
        maxDistance: state.preferences.maxDistance,
        maxAge: state.preferences.maxAge,
        theme: state.preferences.theme
      });
      await refreshCandidatesBackend();
    } catch (err) {
      console.error(err);
    }
  } else {
    filterAndLoadProfiles();
  }
  saveStateToLocalStorage();
}

async function handleAgePreferenceChange(e) {
  const val = e.target.value;
  document.getElementById('age-val').innerText = `${val} years`;
  state.preferences.maxAge = parseInt(val);
  
  if (isBackendMode) {
    try {
      await apiFetch('/api/preferences', 'POST', {
        maxDistance: state.preferences.maxDistance,
        maxAge: state.preferences.maxAge,
        theme: state.preferences.theme
      });
      await refreshCandidatesBackend();
    } catch (err) {
      console.error(err);
    }
  } else {
    filterAndLoadProfiles();
  }
  saveStateToLocalStorage();
}

async function handleResetApp() {
  if (confirm("Are you sure you want to reset the app? This deletes all chats, matches, and preferences.")) {
    try { endVideoCall(); } catch(e) {}
    
    if (isBackendMode) {
      try {
        await apiFetch('/api/reset', 'POST');
      } catch (err) {
        console.error("Failed to reset backend: ", err);
      }
    }
    
    if (state.pendingReplyTimers) {
      Object.keys(state.pendingReplyTimers).forEach(id => {
        clearTimeout(state.pendingReplyTimers[id]);
      });
    }
    localStorage.removeItem('spark_dating_app_state');
    location.reload();
  }
}

// ==========================================================================
// Event Listeners Binding
// ==========================================================================
function initializeEventListeners() {
  initApp();
  
  document.getElementById('btn-get-started')?.addEventListener('click', () => {
    navigateToScreen('onboarding');
  });
  
  document.getElementById('onboarding-form')?.addEventListener('submit', handleOnboardingSubmit);
  
  document.querySelectorAll('.interest-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      tag.classList.toggle('selected');
    });
  });

  document.querySelectorAll('#screen-onboarding .gender-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('#screen-onboarding .gender-option').forEach(el => el.classList.remove('selected'));
      opt.classList.add('selected');
    });
  });
  
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
    });
  });
  
  document.getElementById('btn-nope')?.addEventListener('click', () => triggerButtonSwipe('nope'));
  document.getElementById('btn-like')?.addEventListener('click', () => triggerButtonSwipe('like'));
  document.getElementById('btn-super')?.addEventListener('click', () => triggerButtonSwipe('super'));
  document.getElementById('btn-undo')?.addEventListener('click', handleUndoSwipe);
  
  document.getElementById('btn-reset-deck')?.addEventListener('click', async () => {
    state.history = [];
    if (isBackendMode) {
      try {
        // Reset swipes state on backend (reset deck deletes history)
        // Wait, for deck reset, it is easiest to hit reset or just clear local deck history.
        // To be clean, backend reset endpoint clears everything, but we can just clear history.
        // We will reset the db here to start clean.
        await apiFetch('/api/reset', 'POST');
        // Re-onboard the user to save profile
        await apiFetch('/api/onboard', 'POST', state.user);
        await refreshCandidatesBackend();
      } catch (err) {
        console.error(err);
      }
    } else {
      filterAndLoadProfiles();
    }
    renderCardDeck();
    saveStateToLocalStorage();
  });
  
  document.getElementById('details-close-btn')?.addEventListener('click', closeProfileDetails);
  document.getElementById('profile-details-sheet')?.addEventListener('click', (e) => {
    if (e.target.id === 'profile-details-sheet' || e.target.className === 'details-handle-bar') {
      closeProfileDetails();
    }
  });
  
  document.getElementById('btn-match-chat')?.addEventListener('click', handleSendMessageFromMatch);
  document.getElementById('btn-match-swipe')?.addEventListener('click', closeMatchOverlay);
  
  document.getElementById('chat-back-btn')?.addEventListener('click', closeChatConversation);
  document.getElementById('chat-send-btn')?.addEventListener('click', handleSendMessage);
  document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSendMessage();
  });
  
  // Video and Voice Calling buttons inside Chat Room
  document.getElementById('chat-call-video-btn')?.addEventListener('click', () => {
    startVideoCall(state.activeChatProfileId);
  });
  document.getElementById('chat-call-voice-btn')?.addEventListener('click', () => {
    startVideoCall(state.activeChatProfileId);
  });
  
  // Video calling overlay action buttons
  document.getElementById('btn-video-mute')?.addEventListener('click', toggleVideoMute);
  document.getElementById('btn-video-camera')?.addEventListener('click', toggleVideoCamera);
  document.getElementById('btn-video-end')?.addEventListener('click', endVideoCall);
  
  document.getElementById('chats-search')?.addEventListener('input', handleChatsSearch);
  
  document.getElementById('pref-distance')?.addEventListener('input', handleDistancePreferenceChange);
  document.getElementById('pref-age')?.addEventListener('input', handleAgePreferenceChange);
  
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      setAppTheme(theme);
      renderProfileSettings();
    });
  });
  
  document.getElementById('btn-app-reset')?.addEventListener('click', handleResetApp);
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initializeEventListeners);
} else {
  initializeEventListeners();
}
