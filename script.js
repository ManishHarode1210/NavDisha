document.addEventListener('DOMContentLoaded', () => {
    // --- Global Firebase and UI variables ---
    let app, auth, db;
    let chatUnsubscribe = null;
    let replyingToMessage = null; 
    const loader = document.getElementById('loader');
    console.log("NavDisha Script Initialized.");

    // --- Config and Initialization ---
    if (typeof firebaseConfig === 'undefined') {
        console.error("CRITICAL: firebase-config.js is not loaded or firebaseConfig is not defined.");
        if (loader) loader.classList.add('hidden');
        return;
    }

    try {
        app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        console.log("Firebase Initialized Successfully using v8 syntax.");
        auth.onAuthStateChanged((user) => handleAuthState(user));
    } catch (error) {
        console.error("Firebase Initialization Error:", error);
        if (loader) loader.classList.add('hidden');
    }

    // --- Reply Helper Functions ---
    const setupReply = (msg) => {
        replyingToMessage = { id: msg.id, author: msg.userName, text: msg.text };
        const previewContainer = document.getElementById('reply-preview-container');
        const previewText = document.getElementById('reply-preview-text');
        if (previewContainer && previewText) {
            previewText.textContent = `${replyingToMessage.author}: ${replyingToMessage.text}`;
            previewContainer.classList.remove('hidden');
            document.getElementById('message-input').focus();
        }
    };

    const cancelReply = () => {
        replyingToMessage = null;
        const previewContainer = document.getElementById('reply-preview-container');
        if (previewContainer) {
            previewContainer.classList.add('hidden');
        }
    };
     


    

    // --- Function to render chat messages (REFACTORED for reliability) ---
    // --- Function to render chat messages (With Reply Navigation) ---
    // --- Function to render chat messages (Fixed Reply Button + View Replies) ---
    // --- Function to render chat messages (FIXED Reply & Navigation) ---
    const renderMessages = (messages) => {
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) return;
        messagesContainer.innerHTML = '';
        const currentUser = auth.currentUser;

        // 1. Helper: Map replies (Key: ParentID, Value: List of ReplyIDs)
        const replyMap = {};
        messages.forEach(m => {
            if (m.replyToId) {
                if (!replyMap[m.replyToId]) replyMap[m.replyToId] = [];
                replyMap[m.replyToId].push(m.id);
            }
        });

        messages.forEach(msg => {
            const isCurrentUser = currentUser && currentUser.uid === msg.userId;

            // Main message row
            const messageEl = document.createElement('div');
            messageEl.id = `msg-${msg.id}`;
            messageEl.className = `flex items-start gap-2 group ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4 relative`;

            // Avatar
            const initial = msg.userName ? msg.userName.charAt(0).toUpperCase() : 'U';
            const avatar = document.createElement('div');
            avatar.className = `flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-gray-900 ${isCurrentUser ? 'bg-cyan-500' : 'bg-pink-500'}`;
            avatar.textContent = initial;

            // Content Column
            const contentContainer = document.createElement('div');
            contentContainer.className = `flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} max-w-[85%]`;

            // User Name
            const userNameEl = document.createElement('p');
            userNameEl.className = 'text-xs text-gray-400 mb-1 mx-2';
            userNameEl.textContent = msg.userName;
            contentContainer.appendChild(userNameEl);

            // Bubble Row (Holds Bubble + Reply Arrow)
            const bubbleRow = document.createElement('div');
            bubbleRow.className = 'flex items-center gap-2 relative'; 

            // The Bubble
            const bubble = document.createElement('div');
            bubble.className = `p-3 rounded-lg shadow-md relative ${isCurrentUser ? 'bg-cyan-600 rounded-br-none' : 'bg-gray-700 rounded-bl-none'}`;
            
            // --- A. Quoted Reply Display ---
            if (msg.replyToAuthor) {
                const replyQuote = document.createElement('div');
                replyQuote.className = 'mb-2 p-2 bg-gray-900 bg-opacity-40 rounded border-l-2 border-cyan-400 cursor-pointer hover:opacity-80 transition';
                replyQuote.innerHTML = `
                    <p class="text-xs font-bold text-gray-400">${msg.replyToAuthor}</p>
                    <p class="text-xs text-gray-300 truncate">${msg.replyToText}</p>
                `;
                replyQuote.addEventListener('click', () => {
                    const parentEl = document.getElementById(`msg-${msg.replyToId}`);
                    if (parentEl) {
                        parentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        parentEl.classList.add('highlight-message');
                        setTimeout(() => parentEl.classList.remove('highlight-message'), 2000);
                    }
                });
                bubble.appendChild(replyQuote);
            }

            // --- B. File Display ---
            if (msg.fileUrl) {
                const isImage = msg.fileType && msg.fileType.startsWith('image/');
                const fileDiv = document.createElement('div');
                fileDiv.className = "mb-2 rounded overflow-hidden border border-gray-600";
                if (isImage) {
                    fileDiv.innerHTML = `<a href="${msg.fileUrl}" target="_blank"><img src="${msg.fileUrl}" class="max-h-48 w-full object-cover"></a>`;
                } else {
                    fileDiv.innerHTML = `<a href="${msg.fileUrl}" target="_blank" class="flex items-center gap-2 bg-gray-900 p-2 text-xs text-cyan-300"><span>📎</span> View Attachment</a>`;
                }
                bubble.appendChild(fileDiv);
            }

            // --- C. Text Display ---
            if (msg.text) {
                const txt = document.createElement('p');
                txt.className = 'text-white text-sm break-words leading-relaxed';
                txt.textContent = msg.text;
                bubble.appendChild(txt);
            }

            // --- D. "View Replies" Navigation Button ---
            if (replyMap[msg.id] && replyMap[msg.id].length > 0) {
                const replyCount = replyMap[msg.id].length;
                const navBtn = document.createElement('button');
                // High Z-index ensures it's clickable
                navBtn.className = "absolute -bottom-3 right-0 translate-y-1/2 bg-gray-800 border border-gray-600 text-cyan-400 text-[10px] px-2 py-0.5 rounded-full shadow-lg hover:bg-gray-700 transition flex items-center gap-1 z-20 cursor-pointer";
                navBtn.innerHTML = `<span>⬇️</span> ${replyCount} Repl${replyCount > 1 ? 'ies' : 'y'}`;
                
                let currentReplyIndex = 0;
                navBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const replyIds = replyMap[msg.id];
                    const targetId = replyIds[currentReplyIndex];
                    const targetEl = document.getElementById(`msg-${targetId}`);
                    if (targetEl) {
                        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        targetEl.classList.add('highlight-message');
                        setTimeout(() => targetEl.classList.remove('highlight-message'), 2000);
                        currentReplyIndex = (currentReplyIndex + 1) % replyIds.length;
                    }
                });
                bubble.appendChild(navBtn);
            }

            // --- E. The Reply Arrow (Re-added & Fixed) ---
            const replyActionBtn = document.createElement('button');
            // 'group-hover:opacity-100' makes it show when you hover the message
            replyActionBtn.className = 'opacity-0 group-hover:opacity-100 transition text-gray-400 hover:text-white text-xl px-2 cursor-pointer z-10';
            replyActionBtn.innerHTML = '↩';
            replyActionBtn.title = "Reply to this message";
            
            replyActionBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Ensure setupReply exists
                if (typeof setupReply === 'function') {
                    setupReply(msg);
                } else {
                    console.error("SetupReply function not found");
                }
            });

            // Assemble Bubble Row
            if (isCurrentUser) {
                bubbleRow.appendChild(replyActionBtn);
                bubbleRow.appendChild(bubble);
            } else {
                bubbleRow.appendChild(bubble);
                bubbleRow.appendChild(replyActionBtn);
            }

            contentContainer.appendChild(bubbleRow);

            if (!isCurrentUser) messageEl.appendChild(avatar);
            messageEl.appendChild(contentContainer);
            if (isCurrentUser) messageEl.appendChild(avatar);

            messagesContainer.appendChild(messageEl);
        });
        
        // Auto-scroll logic
        if (!window.location.hash) {
             messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    





        // --- RESTORED: TOGGLE CHAT/AI FULL SCREEN LOGIC ---
    
    // 1. CHAT TOGGLE
    const chatToggleBtn = document.getElementById('chat-toggle-size-btn');
    const chatContainer = document.getElementById('community-chat-container');
    const aiContainer = document.getElementById('ai-suggestions-container');
    const chatExpandIcon = document.getElementById('icon-expand');
    const chatCompressIcon = document.getElementById('icon-compress');

    if (chatToggleBtn && chatContainer && aiContainer) {
        chatToggleBtn.addEventListener('click', () => {
            // Hide AI, Expand Chat
            aiContainer.classList.toggle('hidden');
            chatContainer.classList.toggle('lg:col-span-2');
            
            // Toggle Icons
            if (chatExpandIcon) chatExpandIcon.classList.toggle('hidden');
            if (chatCompressIcon) chatCompressIcon.classList.toggle('hidden');
        });
    }

    
    };




    

    // --- NEW AI SUGGESTION DISPLAY ---
const displayAiSuggestion = (question, messageId) => {
    const aiContainer = document.getElementById('ai-messages-container');
    if (!aiContainer) return;

    // 1. Add User's Question to AI Panel
    aiContainer.innerHTML += `
        <div class="bg-cyan-900 bg-opacity-30 p-3 rounded-lg mb-4 border border-cyan-700">
            <p class="text-cyan-400 font-semibold">Q: ${question}</p>
        </div>
    `;

    // 2. Simulate AI Typing/Response
    aiContainer.innerHTML += `
        <div id="ai-response-${messageId}" class="bg-gray-700 p-3 rounded-lg animate-pulse">
            <p class="text-gray-300">AI is thinking and analyzing the question...</p>
        </div>
    `;
    aiContainer.scrollTop = aiContainer.scrollHeight;

    // 3. Update with Placeholder Response (Simulate 3 seconds loading)
    setTimeout(() => {
        const aiResponseEl = document.getElementById(`ai-response-${messageId}`);
        if (aiResponseEl) {
            aiResponseEl.classList.remove('animate-pulse');
            aiResponseEl.innerHTML = `
                <p class="text-white font-semibold mb-2">💡 AI Suggestion:</p>
                <p class="text-gray-300 text-sm">
                    This answer is generated by AI. For the question "${question}", the relevant concept is explained below: The AI is designed to pull information from books and solutions posted on NavDisha.
                </p>
                <p class="text-gray-300 text-sm mt-2">
                    For example, to solve a math problem, the AI would give a step-by-step method here.
                </p>
            `;
        }
    }, 3000);
};


    // --- Function to populate the dashboard ---
    const populateDashboard = (userData) => {
        if (!userData) return;
        document.getElementById('welcome-message').textContent = `Welcome back, ${userData.name || 'User'}!`;
        document.getElementById('attendance-bar').style.width = `${userData.attendance || 0}%`;
        document.getElementById('attendance-text').textContent = `${userData.attendance || 0}% Present`;
        const ratingStars = document.getElementById('rating-stars');
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            starsHtml += `<span class="${i <= (userData.rating || 0) ? 'text-yellow-400' : 'text-gray-600'}">★</span>`;
        }
        ratingStars.innerHTML = starsHtml;
        document.getElementById('rating-text').textContent = `${(userData.rating || 0).toFixed(1)} / 5.0`;
        document.getElementById('courses-learned-count').textContent = userData.coursesLearned || 0;
        document.getElementById('courses-in-progress-count').textContent = userData.coursesInProgress || 0;
        
        document.getElementById('questions-asked-count').textContent = userData.questionsAsked || 0;
        const questionsList = document.getElementById('questions-history-list');
        if (questionsList && userData.questions && Array.isArray(userData.questions)) {
            const reversedQuestions = [...userData.questions].reverse();
            if(reversedQuestions.length === 0){
                questionsList.innerHTML = `<li><p class="text-gray-500">Aapne abhi tak koi sawaal nahi pucha hai.</p></li>`;
            } else {
                 questionsList.innerHTML = reversedQuestions.map(q =>
                    `<li>
                        <a href="index.html#${q.messageId}" class="block p-2 rounded-md hover:bg-gray-700 transition truncate" title="${q.messageText}">
                           → ${q.messageText}
                        </a>
                     </li>`
                ).join('');
            }
        }

        const historyList = document.getElementById('history-list');
        const history = userData.history || ['No activity yet.'];
        historyList.innerHTML = history.map(item => `<li>${item}</li>`).join('');
    };

    // --- Auth State Handler ---
    const handleAuthState = async (user) => {
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        const mainApp = document.getElementById('main-app');
        const authPage = document.getElementById('auth-page');

        if (chatUnsubscribe) {
            chatUnsubscribe();
            chatUnsubscribe = null;
        }

        if (user) {
            if (currentPath.includes('dashboard.html')) {
                const docSnap = await db.collection('users').doc(user.uid).get();
                if (docSnap.exists) populateDashboard(docSnap.data());
                if (mainApp) mainApp.classList.remove('hidden');
            } else {
                if (mainApp) mainApp.classList.remove('hidden');
                if (authPage) authPage.classList.add('hidden');
                const chatRef = db.collection('community-chat')
                .orderBy('timestamp', 'asc')
                .limit(50);
                chatUnsubscribe = chatRef.onSnapshot(snapshot => {
                    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    renderMessages(messages);

                    if (window.location.hash) {
                        const messageId = window.location.hash.substring(1);
                        const messageToHighlight = document.getElementById(`msg-${messageId}`);
                        if (messageToHighlight) {
                            messageToHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            messageToHighlight.classList.add('highlight-message');
                            setTimeout(() => {
                                messageToHighlight.classList.remove('highlight-message');
                                history.pushState("", document.title, window.location.pathname + window.location.search);
                            }, 3000); 
                        }
                    }
                }, error => console.error("CRITICAL ERROR listening to chat:", error));
            }
        } else {
            if (currentPath.includes('dashboard.html')) {
                window.location.href = 'index.html';
            } else {
                if (mainApp) mainApp.classList.add('hidden');
                if (authPage) authPage.classList.remove('hidden');
            }
        }
        if (loader) loader.classList.add('hidden');
    };
    
    // --- All Element Selections ---
    const loginFormEl = document.getElementById('login-form');
    const signupFormEl = document.getElementById('signup-form');
    const commentForm = document.getElementById('comment-form');
    const cancelReplyBtn = document.getElementById('cancel-reply-btn');

    // --- Event Listeners ---
    // --- Password Toggle Logic ---
    const setupPasswordToggle = (inputId, toggleId) => {
        const input = document.getElementById(inputId);
        const toggleBtn = document.getElementById(toggleId);

        if (input && toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);
                
                // Update Icon Color/Style to indicate state
                if (type === 'text') {
                    toggleBtn.classList.add('text-cyan-400'); // Active color
                    toggleBtn.classList.remove('text-gray-400');
                } else {
                    toggleBtn.classList.add('text-gray-400');
                    toggleBtn.classList.remove('text-cyan-400');
                }
            });
        }
    };

    // Initialize toggles for both forms
    setupPasswordToggle('login-password', 'toggle-login-password');
    setupPasswordToggle('signup-password', 'toggle-signup-password');
    if(cancelReplyBtn) {
        cancelReplyBtn.addEventListener('click', cancelReply);
    }
    
    if (loginFormEl && signupFormEl) {
        document.getElementById('show-signup').addEventListener('click', (e) => { e.preventDefault(); loginFormEl.classList.add('hidden'); signupFormEl.classList.remove('hidden'); });
        document.getElementById('show-login').addEventListener('click', (e) => { e.preventDefault(); signupFormEl.classList.add('hidden'); loginFormEl.classList.remove('hidden'); });
        
        signupFormEl.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const errorDiv = document.getElementById('signup-error');
            try {
                if (loader) loader.classList.remove('hidden');
                if (errorDiv) errorDiv.classList.add('hidden');
                const userCred = await auth.createUserWithEmailAndPassword(email, password);
                const defaultData = { name, email, attendance: 75, rating: 4.5, coursesLearned: 1, coursesInProgress: 2, questionsAsked: 0, questions: [], history: ["Created NavDisha Account."] };
                await db.collection('users').doc(userCred.user.uid).set(defaultData);
            } catch (error) {
                if (errorDiv) { errorDiv.textContent = error.message; errorDiv.classList.remove('hidden'); }
            } finally {
                if (loader) loader.classList.add('hidden');
            }
        });

        loginFormEl.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const errorDiv = document.getElementById('login-error');
            try {
                if (loader) loader.classList.remove('hidden');
                if (errorDiv) errorDiv.classList.add('hidden');
                await auth.signInWithEmailAndPassword(email, password);
            } catch (error) {
                if (errorDiv) { errorDiv.textContent = error.message; errorDiv.classList.remove('hidden'); }
            } finally {
                if (loader) loader.classList.add('hidden');
            }
        });
    }


   // --- TOGGLE AI FULL SCREEN & CHATBOT MODE ---
    const aiToggleBtn = document.getElementById('ai-toggle-size-btn');
    const aiInputArea = document.getElementById('ai-input-area');
    const aiExpand = document.getElementById('ai-icon-expand');
    const aiCompress = document.getElementById('ai-icon-compress');
    
    // Reuse existing variables if defined, or grab them here
    const chatSection = document.getElementById('community-chat-container');
    const aiSection = document.getElementById('ai-suggestions-container');

    if (aiToggleBtn && chatSection && aiSection) {
        aiToggleBtn.addEventListener('click', () => {
            // 1. Hide/Show Chat section
            chatSection.classList.toggle('hidden');
            
            // 2. Expand/Shrink AI section
            aiSection.classList.toggle('lg:col-span-2');
            
            // 3. Toggle Icons
            aiExpand.classList.toggle('hidden');
            aiCompress.classList.toggle('hidden');

            // 4. TOGGLE INPUT AREA (The Magic Part)
            // If we are expanding, remove 'hidden'. If compressing, add 'hidden'.
            if (aiSection.classList.contains('lg:col-span-2')) {
                aiInputArea.classList.remove('hidden'); // Show Input
                document.getElementById('ai-user-input').focus(); // Auto-focus
            } else {
                aiInputArea.classList.add('hidden'); // Hide Input
            }
        });
    }

    // --- CHAT FORM LOGIC (Text + File Upload) ---
    if (commentForm) {
        // 1. Attachment UI Logic
        const chatAttachBtn = document.getElementById('chat-attach-btn');
        const chatFileInput = document.getElementById('chat-file-input');
        const chatPreview = document.getElementById('chat-file-preview');
        const chatFileName = document.getElementById('chat-file-name');
        const removeChatFile = document.getElementById('remove-chat-file');

        // Open File Dialog
        if(chatAttachBtn) chatAttachBtn.addEventListener('click', () => chatFileInput.click());

        // Show Preview when file selected
        if(chatFileInput) chatFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                chatPreview.classList.remove('hidden');
                chatFileName.textContent = "📎 " + file.name;
            }
        });

        // Remove selected file
        if(removeChatFile) removeChatFile.addEventListener('click', () => {
            chatFileInput.value = '';
            chatPreview.classList.add('hidden');
        });

        // 2. Submit Logic (Sending the Message)
        commentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const messageInput = document.getElementById('message-input');
            const sendButton = document.getElementById('send-button');
            const messageText = messageInput.value.trim();
            const file = chatFileInput.files[0]; // Get the file
            const user = auth.currentUser;

            // Don't send if empty AND no file
            if ((!messageText && !file) || !user) return;

            // UI: Disable form while sending
            messageInput.disabled = true;
            sendButton.disabled = true;
            sendButton.textContent = 'Sending...';

            try {
                // --- A. UPLOAD FILE TO CLOUDINARY (If exists) ---
                let uploadedFileUrl = null;
                let uploadedFileType = null;

                if (file) {
                    // !!! USE YOUR REAL KEYS HERE !!!
                    const cloudName = "da9oyzvtj"; 
                    const uploadPreset = "ml_default"; 
                    
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('upload_preset', uploadPreset);
                    formData.append('resource_type', 'auto');

                    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (!res.ok) throw new Error("Image upload failed");
                    const data = await res.json();
                    uploadedFileUrl = data.secure_url;
                    uploadedFileType = file.type;
                }

                // --- B. SAVE TO FIRESTORE ---
                const userDocRef = db.collection('users').doc(user.uid);
                const docSnap = await userDocRef.get();

                if (docSnap.exists) {
                    const newMessage = {
                        text: messageText, 
                        userName: docSnap.data().name,
                        userId: user.uid,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                        // Add file data if it exists
                        fileUrl: uploadedFileUrl,
                        fileType: uploadedFileType
                    };

                    // Handle Replies
                    if (replyingToMessage) {
                        newMessage.replyToId = replyingToMessage.id;
                        newMessage.replyToAuthor = replyingToMessage.author;
                        newMessage.replyToText = replyingToMessage.text;
                    }

                    const newDocRef = await db.collection('community-chat').add(newMessage);

                    // --- C. TRIGGER AI (Only if there is text ending in ?) ---
                    if (messageText.trim().endsWith('?')) {
                        triggerAiResponse(messageText);
                        
                        // Update User Stats
                         const questionData = {
                            messageId: newDocRef.id,
                            messageText: messageText.substring(0, 70) + (messageText.length > 70 ? '...' : '')
                        };
                        await userDocRef.update({
                            questionsAsked: firebase.firestore.FieldValue.increment(1),
                            questions: firebase.firestore.FieldValue.arrayUnion(questionData)
                        });
                    }

                    // Reset UI
                    messageInput.value = '';
                    chatFileInput.value = ''; // Clear file input
                    chatPreview.classList.add('hidden'); // Hide preview
                    cancelReply();
                }
            } catch (error) {
                console.error("Chat Error:", error);
                alert("Failed to send message: " + error.message);
            } finally {
                messageInput.disabled = false;
                sendButton.disabled = false;
                sendButton.textContent = 'Send';
                messageInput.focus();
            }
        });
    }

    // --- AI SUGGESTION LOGIC ---
// --- AI BRAIN (Handles both Analysis & Direct Chat) ---
const generateAiResponse = (questionText, isDirectChat = false) => {
    const aiContainer = document.getElementById('ai-messages-container');
    if (!aiContainer) return;

    // 1. If it's from Community Chat, show the "Analyzed" card.
    // If it's Direct Chat, we already showed the bubble, so skip this.
    if (!isDirectChat) {
        const analysisHTML = `
            <div class="bg-cyan-900 bg-opacity-40 border border-cyan-600 p-3 rounded-lg mb-4 slide-in-right">
                <span class="text-xs text-cyan-400 uppercase font-bold">Community Question Analyzed</span>
                <p class="text-white mt-1 font-medium">"${questionText}"</p>
            </div>`;
        aiContainer.insertAdjacentHTML('beforeend', analysisHTML);
    }

    // 2. Show "AI Thinking..." Loader
    const loadingId = `loading-${Date.now()}`;
    const loadingHTML = `
        <div id="${loadingId}" class="bg-gray-700 p-4 rounded-lg mb-4 animate-pulse flex items-center gap-3 w-fit">
            <div class="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-gray-300 text-sm">AI is typing...</p>
        </div>
    `;
    aiContainer.insertAdjacentHTML('beforeend', loadingHTML);
    aiContainer.scrollTop = aiContainer.scrollHeight;

    // 3. Generate Answer
    setTimeout(() => {
        const loader = document.getElementById(loadingId);
        if (loader) loader.remove();

        // Smart Keywords
        let answerText = "I can help you with that! Please check the resources tab.";
        const lowerQ = questionText.toLowerCase();

        if (lowerQ.includes('math')) answerText = "For <b>Math</b>, focus on the step-by-step formulas in Chapter 4. Would you like me to find a specific PDF?";
        else if (lowerQ.includes('science') || lowerQ.includes('phy')) answerText = "In <b>Physics</b>, always check your units first. I found related notes in 'Physics 101'.";
        else if (lowerQ.includes('hello') || lowerQ.includes('hi')) answerText = "Hello! I am the NavDisha AI. Ask me anything about your study materials.";
        else answerText = "That's an interesting question. I recommend searching the <b>Community Notes</b> or asking a mentor.";

        // 4. Show AI Bubble (Left Side)
        const answerHTML = `
            <div class="flex justify-start mb-6">
                <div class="flex items-start max-w-[90%] gap-2">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                        🤖
                    </div>
                    <div class="bg-gray-800 border border-gray-700 p-3 rounded-lg rounded-tl-none shadow-lg">
                        <p class="text-gray-200 text-sm leading-relaxed">${answerText}</p>
                    </div>
                </div>
            </div>
        `;
        aiContainer.insertAdjacentHTML('beforeend', answerHTML);
        aiContainer.scrollTop = aiContainer.scrollHeight;

    }, 1500);
};

// Alias for the old function name (so your old code still works)
const triggerAiResponse = (text) => generateAiResponse(text, false);
    // --- Forgot Password Logic ---
    const resetFormEl = document.getElementById('reset-form');
    const showResetFromLogin = document.getElementById('show-reset-from-login');
    const showResetFromSignup = document.getElementById('show-reset-from-signup');
    const cancelResetBtn = document.getElementById('cancel-reset');

    // Helper to switch to Reset Form
    const switchToReset = (e) => {
        e.preventDefault();
        if (loginFormEl) loginFormEl.classList.add('hidden');
        if (signupFormEl) signupFormEl.classList.add('hidden');
        if (resetFormEl) resetFormEl.classList.remove('hidden');
    };

    // 1. Event Listeners to Show/Hide Form
    if (showResetFromLogin) showResetFromLogin.addEventListener('click', switchToReset);
    if (showResetFromSignup) showResetFromSignup.addEventListener('click', switchToReset);

    if (cancelResetBtn) {
        cancelResetBtn.addEventListener('click', (e) => {
            e.preventDefault();
            resetFormEl.classList.add('hidden');
            loginFormEl.classList.remove('hidden'); // Always go back to login
        });
    }

    // 2. Handle Reset Email Submission
    if (resetFormEl) {
        resetFormEl.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('reset-email').value;
            const messageDiv = document.getElementById('reset-message');
            const errorDiv = document.getElementById('reset-error');
            
            try {
                if (loader) loader.classList.remove('hidden');
                if (messageDiv) messageDiv.classList.add('hidden');
                if (errorDiv) errorDiv.classList.add('hidden');

                // Firebase function to send reset email
                await auth.sendPasswordResetEmail(email);
                
                if (messageDiv) {
                    messageDiv.textContent = `Reset link sent to ${email}. Check your inbox!`;
                    messageDiv.classList.remove('hidden');
                }
                // Optional: Clear input
                document.getElementById('reset-email').value = '';

            } catch (error) {
                if (errorDiv) {
                    errorDiv.textContent = error.message;
                    errorDiv.classList.remove('hidden');
                }
            } finally {
                if (loader) loader.classList.add('hidden');
            }
        });
    }
    // --- DASHBOARD UPLOAD BUTTON LOGIC ---
    
   // --- UPLOAD LOGIC (With Custom Name Feature) ---
    const heroBtn = document.getElementById('hero-upload-btn');
    const heroInput = document.getElementById('hero-file-input');
    const heroStatus = document.getElementById('hero-upload-status');

    // !!! ENTER YOUR KEYS HERE !!!
    const cloudName = "da9oyzvtj"; 
    const uploadPreset = "ml_default"; 

    if (heroBtn && heroInput) {
        // 1. Click button -> Trigger input
        heroBtn.addEventListener('click', () => {
            heroInput.click();
        });

        // 2. File Selected -> Ask Name -> Upload
        heroInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            const user = auth.currentUser;

            if (!file) return;
            if (!user) { 
                alert("Please login to upload."); 
                heroInput.value = ''; 
                return; 
            }

            // --- ASK USER FOR FILE NAME ---
            let customName = prompt("Enter a name for this file:", file.name);

            // If user clicked Cancel, stop
            if (customName === null) {
                heroInput.value = ''; 
                return; 
            }

            // If user left it blank, use original name
            if (customName.trim() === "") {
                customName = file.name;
            }

            // --- START UPLOAD ---
            heroBtn.disabled = true;
            heroBtn.classList.add('opacity-50');
            heroStatus.textContent = "Uploading...";
            heroStatus.classList.remove('hidden', 'text-green-400', 'text-red-400');
            heroStatus.classList.add('text-gray-400');

            try {
                // Cloudinary Upload
                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', uploadPreset); 
                formData.append('resource_type', 'auto'); 

                const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) throw new Error('Cloudinary Upload Failed');
                const data = await response.json();

                // Save to Database
                const userDoc = await db.collection('users').doc(user.uid).get();
                const userName = userDoc.exists ? userDoc.data().name : "Student";

                await db.collection('resources').add({
                    fileName: customName,      // <--- USES THE CUSTOM NAME
                    originalName: file.name,
                    fileUrl: data.secure_url,
                    fileType: file.type, 
                    uploadedBy: userName,
                    uploadedById: user.uid,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Success Message
                heroStatus.textContent = "✅ Uploaded!";
                heroStatus.classList.remove('text-gray-400');
                heroStatus.classList.add('text-green-400');
                heroInput.value = ''; 

                setTimeout(() => {
                    heroStatus.classList.add('hidden');
                    heroBtn.disabled = false;
                    heroBtn.classList.remove('opacity-50');
                }, 3000);

            } catch (error) {
                console.error("Upload Error:", error);
                heroStatus.textContent = "❌ Failed";
                heroStatus.classList.remove('text-gray-400');
                heroStatus.classList.add('text-red-400');
                heroBtn.disabled = false;
                heroBtn.classList.remove('opacity-50');
            }
        // });
    

            // --- FORCE DISPLAY RESOURCES (Place this at the bottom of script.js) ---
    const publicListContainer = document.getElementById('public-resources-list');
    
    if (publicListContainer) {
        console.log("Found Resource List Container. Fetching data...");
        
        // Note: We removed .orderBy('timestamp') temporarily to ensure files show up
        db.collection('resources').limit(20).onSnapshot(snapshot => {
            
            console.log("Database Snapshot Received. Files found:", snapshot.size);
            publicListContainer.innerHTML = ''; // Clear "Loading..." text
            
            if (snapshot.empty) {
                publicListContainer.innerHTML = '<p class="text-white col-span-3 text-center">No files found in database.</p>';
                return;
            }

            snapshot.forEach(doc => {
                const data = doc.data();
                const icon = (data.fileType && data.fileType.startsWith('image/')) ? '🖼️' : '📄';
                
                // Create Card HTML
                const card = `
                    <div class="bg-gray-800 rounded-lg p-5 shadow-lg border border-gray-700 flex flex-col justify-between">
                        <div>
                            <div class="flex items-start justify-between">
                                <span class="text-3xl">${icon}</span>
                            </div>
                            <h4 class="mt-3 text-lg font-semibold text-white truncate" title="${data.fileName}">${data.fileName}</h4>
                            <p class="text-sm text-gray-400 mt-1">By: <span class="text-cyan-400">${data.uploadedBy || 'Student'}</span></p>
                        </div>
                        <div class="mt-4 pt-4 border-t border-gray-700 flex gap-2">
                             <a href="${data.fileUrl}" target="_blank" class="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white text-center py-2 rounded text-sm font-medium transition">Download</a>
                        </div>
                    </div>
                `;
                publicListContainer.innerHTML += card;
            });
        }, error => {
            console.error("Error loading resources:", error);
            publicListContainer.innerHTML = `<p class="text-red-400 col-span-3 text-center">Error: ${error.message}</p>`;
        });
    }



    
        });
    }


    // --- DIRECT AI CHATBOT LOGIC ---
    const aiChatForm = document.getElementById('ai-chat-form');
    const aiContainer = document.getElementById('ai-messages-container');

    if (aiChatForm) {
        aiChatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const inputEl = document.getElementById('ai-user-input');
            const questionText = inputEl.value.trim();

            if (!questionText) return;

            // 1. Show User Bubble (Right Side)
            const userBubble = `
                <div class="flex justify-end mb-4 slide-in-right">
                    <div class="bg-purple-600 text-white px-4 py-2 rounded-lg rounded-br-none max-w-[80%] shadow-md">
                        <p>${questionText}</p>
                    </div>
                </div>
            `;
            aiContainer.insertAdjacentHTML('beforeend', userBubble);
            inputEl.value = ''; // Clear input
            aiContainer.scrollTop = aiContainer.scrollHeight;

            // 2. Trigger the AI Response Function (Reusing your existing logic!)
            // We pass 'true' as a second argument to say "This is a direct chat"
            generateAiResponse(questionText, true); 
        });
    }



    // --- ULTIMATE GALLERY LOGIC (Smart PDF Previews + Download Fix) ---
    const resourceContainer = document.getElementById('public-resources-list');
    
    if (resourceContainer) {
        db.collection('resources').limit(20).onSnapshot(snapshot => {
            
            resourceContainer.innerHTML = ''; 
            
            if (snapshot.empty) {
                resourceContainer.innerHTML = `
                    <div class="col-span-full text-center py-12 bg-gray-800 rounded-lg border border-dashed border-gray-600">
                        <p class="text-gray-400">No resources shared yet.</p>
                    </div>`;
                return;
            }

            snapshot.forEach(doc => {
                const data = doc.data();
                
                // 1. FORCE DOWNLOAD LINK (Keep this for the button)
                let finalDownloadUrl = data.fileUrl;
                if (data.fileUrl.includes('cloudinary.com') && data.fileUrl.includes('/upload/')) {
                    finalDownloadUrl = data.fileUrl.replace('/upload/', '/upload/fl_attachment/');
                }

                // 2. DETECT FILE TYPE
                let mediaContent = '';
                const fileType = data.fileType || '';
                const isImage = fileType.startsWith('image/');
                const isVideo = fileType.startsWith('video/');
                const isPDF = fileType === 'application/pdf';

                // 3. CREATE PREVIEW
                if (isImage) {
                    mediaContent = `
                        <div class="h-48 w-full bg-gray-900 overflow-hidden relative border-b border-gray-700">
                            <img src="${data.fileUrl}" alt="Preview" class="w-full h-full object-cover transition-transform duration-500 hover:scale-110">
                        </div>`;
                } 
                else if (isVideo) {
                    mediaContent = `
                        <div class="h-48 w-full bg-black flex items-center justify-center border-b border-gray-700 relative">
                            <video src="${data.fileUrl}" controls class="w-full h-full object-contain"></video>
                        </div>`;
                } 
                else if (isPDF) {
                    // --- THE CLOUDINARY TRICK ---
                    // Convert the PDF link to a JPG link. This creates a thumbnail of Page 1.
                    // Example: file.pdf -> file.jpg
                    let pdfThumbnail = data.fileUrl;
                    if (data.fileUrl.includes('cloudinary.com') && data.fileUrl.endsWith('.pdf')) {
                        pdfThumbnail = data.fileUrl.replace('.pdf', '.jpg');
                    }

                    // Now display it using an <img> tag (just like photos!)
                    mediaContent = `
                        <div class="h-48 w-full bg-gray-200 overflow-hidden relative border-b border-gray-700">
                            <img src="${pdfThumbnail}" alt="PDF Document" class="w-full h-full object-cover transition-transform duration-500 hover:scale-110">
                            
                            <span class="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow z-10">PDF</span>
                        </div>`;
                } 
                else {
                    mediaContent = `
                        <div class="h-48 w-full bg-gray-800 flex items-center justify-center border-b border-gray-700">
                            <span class="text-5xl">📄</span>
                        </div>`;
                }

                // 4. BUILD CARD
                const cardHTML = `
                    <div class="group bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden hover:border-cyan-500 transition-all duration-300 flex flex-col">
                        ${mediaContent}
                        
                        <div class="p-4 flex flex-col flex-grow justify-between">
                            <div>
                                <h4 class="text-lg font-bold text-white truncate" title="${data.fileName}">
                                    ${data.fileName}
                                </h4>
                                <p class="text-xs text-gray-400 mt-1">
                                    Shared by: <span class="text-cyan-400">${data.uploadedBy || 'Student'}</span>
                                </p>
                            </div>
                            
                            <div class="mt-4 flex gap-2">
                                <a href="${finalDownloadUrl}" target="_blank" class="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white text-center py-2 rounded-lg text-sm font-semibold transition shadow-lg cursor-pointer">
                                    Download
                                </a>
                                <a href="${data.fileUrl}" target="_blank" class="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-center py-2 rounded-lg text-sm font-medium transition border border-gray-600">
                                    Full View
                                </a>
                            </div>
                        </div>
                    </div>
                `;
                
                resourceContainer.insertAdjacentHTML('beforeend', cardHTML);
            });

        }, error => {
            console.error("Error displaying gallery:", error);
        });
    }
    // Detective Script
const list = document.getElementById('public-resources-list');
if (!list) {
    console.error("🚨 PROBLEM FOUND: I cannot find <div id='public-resources-list'> in your HTML. Please add it!");
} else {
    console.log("✅ HTML ID found. Now checking Database...");
    db.collection('resources').get().then(snap => {
        console.log(`📊 Found ${snap.size} files in the database.`);
        if (snap.size > 0) {
            snap.forEach(doc => console.log(" - File:", doc.data().fileName));
        } else {
            console.warn("⚠️ Database is empty! The Upload button is not saving data correctly.");
        }
    }).catch(err => console.error("❌ Database Error:", err));
}

    // --- Shared Logic ---
    const handleLogout = async (e) => {
        e.preventDefault();
        try { await auth.signOut(); window.location.href = 'index.html'; } 
        catch (error) { console.error("Logout error:", error); }
    };
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
    document.getElementById('logout-btn-desktop')?.addEventListener('click', handleLogout);

    const toggleNav = () => {
        document.getElementById('nav-drawer')?.classList.toggle('is-open');
        document.getElementById('nav-overlay')?.classList.toggle('is-open');
    };
    document.getElementById('mobile-menu-button')?.addEventListener('click', toggleNav);
    document.getElementById('nav-overlay')?.addEventListener('click', toggleNav);
});


// >>>>>>> 98ad196 (Second commit - NavDisha)