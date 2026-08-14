import os
import sys
import json
import random
import asyncio
from typing import List, Dict, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Spark Dating App Backend")

# Enable CORS for local testing from other origins if needed
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods=["*"],
)

DB_PATH = "database.json"

# Candidate profiles database (synced with frontend definitions)
MOCK_CANDIDATES = [
  {
    "id": "sophia",
    "name": "Sophia",
    "age": 24,
    "gender": "female",
    "distance": 4,
    "bio": "Wanderlust soul. Photographer & coffee lover. Looking for someone to explore hidden coffee shops and hiking trails with.",
    "interests": ["Photography", "Coffee", "Hiking", "Art"],
    "image": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=600",
    "gallery": [
      "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1513829096999-4978602297f7?auto=format&fit=crop&q=80&w=600"
    ],
    "personality": {
      "greetings": ["Hey there! I saw you like [INTEREST]. I love that too! Have you done much of it lately?", "Hey! What's your idea of a perfect weekend getaway?"],
      "replies": [
        "I just got back from a photoshoot, so tired but it was amazing! What are you up to?",
        "Coffee is definitely my love language. Let's grab a cup sometime?",
        "That sounds wonderful! I'd love to hear more about that.",
        "Haha that is so true! By the way, what kind of music do you listen to?"
      ]
    }
  },
  {
    "id": "marcus",
    "name": "Marcus",
    "age": 27,
    "gender": "male",
    "distance": 8,
    "bio": "Software engineer by day, fitness enthusiast by night. Always down for travel, coding hackathons, and good street food.",
    "interests": ["Tech", "Coding", "Fitness", "Travel"],
    "image": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=600",
    "gallery": [
      "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1489980508314-941910ded1f4?auto=format&fit=crop&q=80&w=600"
    ],
    "personality": {
      "greetings": ["Hey! Nice matching with you. I noticed you're into [INTEREST]! What got you started?", "Hey! How's your week treating you?"],
      "replies": [
        "I'm working on a new coding side project, it's taking up all my time but I'm close to launching it!",
        "Are you active? I'm hitting the gym later, but down to chat after.",
        "No way, really? That's awesome!",
        "Let's grab some street food sometime and trade tech stories."
      ]
    }
  },
  {
    "id": "elena",
    "name": "Elena",
    "age": 26,
    "gender": "female",
    "distance": 12,
    "bio": "Music is my escape. Classical pianist but love indie concerts. Wine enthusiast and yoga practitioner.",
    "interests": ["Music", "Cooking", "Yoga", "Wine"],
    "image": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=600",
    "gallery": [
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=600"
    ],
    "personality": {
      "greetings": ["Hi! It's great to match. You like [INTEREST]? We should definitely chat about that!", "Hello! What kind of music are you listening to right now?"],
      "replies": [
        "I'm practicing some new Chopin pieces today. Music is my meditation.",
        "Cooking is a big passion of mine, what's your absolute favorite meal to eat?",
        "Yoga has really helped me stay grounded. Do you do any mindfulness practices?",
        "We should share a bottle of wine sometime and talk about life!"
      ]
    }
  },
  {
    "id": "alex",
    "name": "Alex",
    "age": 29,
    "gender": "male",
    "distance": 15,
    "bio": "Bookworm & graphic designer. I love retro cinema, mid-century design, and drinking too much pour-over coffee.",
    "interests": ["Books", "Design", "Cinema", "Coffee"],
    "image": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=600",
    "gallery": [
      "https://images.unsplash.com/photo-1500048993953-d23a436266cf?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=600"
    ],
    "personality": {
      "greetings": ["Hi there. I saw you enjoy [INTEREST] in your profile. That's really interesting! Tell me more?", "Hello. What's the last good book you read or movie you watched?"],
      "replies": [
        "I love spending my rainy afternoons in cozy indie bookstores reading design journals.",
        "Design is about how things work, don't you think? That's what drives me.",
        "Pour-over coffee is an art form. I'm slightly obsessed.",
        "That sounds very deep. I like the way you think."
      ]
    }
  },
  {
    "id": "chloe",
    "name": "Chloe",
    "age": 23,
    "gender": "female",
    "distance": 6,
    "bio": "Fashion designer & contemporary dancer. Life is too short to wear boring clothes. Let\'s dance through the city!",
    "interests": ["Fashion", "Dancing", "Foodie", "Travel"],
    "image": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600",
    "gallery": [
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?auto=format&fit=crop&q=80&w=600"
    ],
    "personality": {
      "greetings": ["Hey! Great to match with you. I saw you're interested in [INTEREST]. Is that something you do often?", "Hey! If you could hop on a plane to anywhere right now, where would you go?"],
      "replies": [
        "I'm working on my new spring collection today, sketching and sewing away!",
        "Dance is my ultimate expression. It just makes me feel alive, you know?",
        "I'm a total foodie. I know this amazing sushi spot in town, we should go!",
        "Travel is the only thing you buy that makes you richer. What was your last trip?"
      ]
    }
  },
  {
    "id": "liam",
    "name": "Liam",
    "age": 28,
    "gender": "male",
    "distance": 9,
    "bio": "Singer-songwriter & indie artist. Always seeking beauty in the ordinary. Let\'s go to a gig or an art gallery.",
    "interests": ["Music", "Art", "Coffee", "Concerts"],
    "image": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600",
    "gallery": [
      "https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=600"
    ],
    "personality": {
      "greetings": ["Hey! Happy to match. I saw you enjoy [INTEREST]! It's so nice to find someone who shares that.", "Hey there! Seen any good live music or art exhibitions lately?"],
      "replies": [
        "I'm playing a small acoustic set at a local pub this weekend. A bit nervous but excited!",
        "Art is how we decorate space; music is how we decorate time. Pretty cool, huh?",
        "I love coffee shop acoustic vibes. That's my happy place.",
        "We should check out the new art gallery exhibition next Tuesday!"
      ]
    }
  }
]

# Database Access Functions
def read_db() -> dict:
    if not os.path.exists(DB_PATH):
        return reset_db()
    try:
        with open(DB_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return reset_db()

def write_db(state: dict):
    with open(DB_PATH, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2, ensure_ascii=False)

def reset_db() -> dict:
    default_state = {
        "user": None,
        "onboarded": False,
        "history": [],
        "matches": [],
        "chats": {},
        "preferences": {
            "maxDistance": 25,
            "minAge": 18,
            "maxAge": 35,
            "theme": "pink"
        }
    }
    write_db(default_state)
    return default_state

# Pydantic Schemas
class UserModel(BaseModel):
    name: str
    age: int
    bio: str
    gender: str
    avatar: str
    interests: List[str]

class SwipeModel(BaseModel):
    profileId: str
    action: str  # "like", "nope", "super"

class PreferencesModel(BaseModel):
    maxDistance: int
    maxAge: int
    theme: str

class MessageSendModel(BaseModel):
    profileId: str
    text: str

# Helper to format timestamp
def get_formatted_time() -> str:
    from datetime import datetime
    now = datetime.now()
    return now.strftime("%I:%M %p")

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

ws_manager = ConnectionManager()

# Background Tasks for Simulated Chats
async def bot_greeting_task(profile_id: str):
    await asyncio.sleep(1.2)
    state = read_db()
    
    # Ensure profile is still matched and no greeting was added
    profile = next((p for p in state["matches"] if p["id"] == profile_id), None)
    if not profile or (profile_id in state["chats"] and len(state["chats"][profile_id]) > 0):
        return
        
    greeting_text = ""
    # Find matching interests
    user_interests = state["user"]["interests"] if state["user"] else []
    candidate = next((c for c in MOCK_CANDIDATES if c["id"] == profile_id), None)
    if not candidate:
        return
        
    common = [i for i in candidate["interests"] if i in user_interests]
    if common:
        greeting_text = candidate["personality"]["greetings"][0].replace("[INTEREST]", common[0])
    else:
        greeting_text = candidate["personality"]["greetings"][1]
        
    new_message = {
        "sender": "bot",
        "text": greeting_text,
        "timestamp": get_formatted_time(),
        "unread": True
    }
    
    if profile_id not in state["chats"]:
        state["chats"][profile_id] = []
    state["chats"][profile_id].append(new_message)
    write_db(state)
    
    # Broadcast to active WebSockets
    await ws_manager.broadcast({
        "type": "message",
        "profileId": profile_id,
        "message": new_message
    })

async def bot_reply_task(profile_id: str):
    # Simulated bot thinking delay
    delay = random.uniform(1.5, 3.0)
    await asyncio.sleep(delay)
    
    state = read_db()
    candidate = next((c for c in MOCK_CANDIDATES if c["id"] == profile_id), None)
    if not candidate or profile_id not in state["chats"]:
        return
        
    # Choose random reply
    reply_text = random.choice(candidate["personality"]["replies"])
    
    new_message = {
        "sender": "bot",
        "text": reply_text,
        "timestamp": get_formatted_time(),
        "unread": True
    }
    
    state["chats"][profile_id].append(new_message)
    write_db(state)
    
    # Send typing hide event followed by actual message
    await ws_manager.broadcast({
        "type": "typing",
        "profileId": profile_id,
        "status": False
    })
    await ws_manager.broadcast({
        "type": "message",
        "profileId": profile_id,
        "message": new_message
    })

# API Routes
@app.get("/api/state")
async def get_state():
    return read_db()

@app.post("/api/onboard")
async def onboard_user(user_data: UserModel):
    state = read_db()
    state["user"] = user_data.dict()
    state["onboarded"] = True
    write_db(state)
    return state

@app.get("/api/candidates")
async def get_candidates():
    state = read_db()
    if not state["onboarded"]:
        return []
        
    swiped_ids = [h["profile"]["id"] for h in state["history"]]
    matched_ids = [m["id"] for m in state["matches"]]
    excluded_ids = swiped_ids + matched_ids
    
    pref = state["preferences"]
    
    filtered = []
    for c in MOCK_CANDIDATES:
        if c["id"] in excluded_ids:
            continue
        # Filter by age and distance settings
        match_dist = c["distance"] <= pref["maxDistance"]
        match_age = c["age"] >= pref["minAge"] and c["age"] <= pref["maxAge"]
        
        if match_dist and match_age:
            filtered.append(c)
            
    return filtered

@app.post("/api/swipe")
async def swipe_profile(swipe: SwipeModel, background_tasks: BackgroundTasks):
    state = read_db()
    profile_id = swipe.profileId
    action = swipe.action
    
    candidate = next((c for c in MOCK_CANDIDATES if c["id"] == profile_id), None)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    # Add swipe log entry
    state["history"].append({
        "profile": candidate,
        "action": action
    })
    
    matched = False
    if action in ["like", "super"]:
        match_chance = 0.7 if action == "super" else 0.45
        if random.random() < match_chance:
            matched = True
            # Add to matched list if not present
            if not any(m["id"] == profile_id for m in state["matches"]):
                state["matches"].insert(0, candidate)
                state["chats"][profile_id] = []
                # Queue automatic welcome greeting from bot character
                background_tasks.add_task(bot_greeting_task, profile_id)
                
    write_db(state)
    return {"matched": matched, "profile": candidate if matched else None}

@app.post("/api/undo")
async def undo_swipe():
    state = read_db()
    if not state["history"]:
        return {"success": False, "message": "No swipes to undo"}
        
    last_swipe = state["history"].pop()
    profile = last_swipe["profile"]
    profile_id = profile["id"]
    
    # Remove from matches if it was matched
    match_index = next((i for i, m in enumerate(state["matches"]) if m["id"] == profile_id), -1)
    if match_index > -1:
        state["matches"].pop(match_index)
        if profile_id in state["chats"]:
            del state["chats"][profile_id]
            
    write_db(state)
    return {"success": True, "profile": profile, "action": last_swipe["action"]}

@app.post("/api/preferences")
async def update_preferences(pref: PreferencesModel):
    state = read_db()
    state["preferences"]["maxDistance"] = pref.maxDistance
    state["preferences"]["maxAge"] = pref.maxAge
    state["preferences"]["theme"] = pref.theme
    write_db(state)
    return state["preferences"]

@app.post("/api/reset")
async def reset_app():
    return reset_db()

@app.post("/api/chat/send")
async def send_message_rest(msg: MessageSendModel, background_tasks: BackgroundTasks):
    state = read_db()
    profile_id = msg.profileId
    text = msg.text
    
    if profile_id not in state["chats"]:
        state["chats"][profile_id] = []
        
    sender = "system" if text.startswith("📹") else "user"
    
    # Append Message
    msg_obj = {
        "sender": sender,
        "text": text,
        "timestamp": get_formatted_time(),
        "unread": False
    }
    state["chats"][profile_id].append(msg_obj)
    write_db(state)
    
    if sender == "user":
        # Trigger Bot Reply Background Task
        background_tasks.add_task(bot_reply_task, profile_id)
        
    return msg_obj

# WebSocket Chat Gateway
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Wait for message packets from client
            data = await websocket.receive_json()
            msg_type = data.get("type")
            
            if msg_type == "message":
                profile_id = data.get("profileId")
                text = data.get("text")
                
                state = read_db()
                if profile_id not in state["chats"]:
                    state["chats"][profile_id] = []
                    
                sender = "system" if text.startswith("📹") else "user"
                
                msg_obj = {
                    "sender": sender,
                    "text": text,
                    "timestamp": get_formatted_time(),
                    "unread": False
                }
                state["chats"][profile_id].append(msg_obj)
                write_db(state)
                
                # Broadcast back confirmation message
                await ws_manager.broadcast({
                    "type": "message",
                    "profileId": profile_id,
                    "message": msg_obj
                })
                
                if sender == "user":
                    # Broadcast typing indicator trigger
                    await ws_manager.broadcast({
                        "type": "typing",
                        "profileId": profile_id,
                        "status": True
                    })
                    
                    # Trigger bot async response delayed worker task
                    asyncio.create_task(bot_reply_task(profile_id))
                
            elif msg_type == "typing":
                profile_id = data.get("profileId")
                status = data.get("status")
                await ws_manager.broadcast({
                    "type": "typing",
                    "profileId": profile_id,
                    "status": status
                })
                
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)

# Detect if running inside a PyInstaller standalone executable wrapper
if getattr(sys, 'frozen', False):
    BASE_DIR = sys._MEIPASS
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    if not BASE_DIR:
        BASE_DIR = "."

# Mount Static Files to serve frontend at the Root url '/'
# Mount static files at root at the end so it doesn't mask API paths
app.mount("/", StaticFiles(directory=BASE_DIR, html=True), name="static")
