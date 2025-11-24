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
    const renderMessages = (messages) => {
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) return;
        messagesContainer.innerHTML = '';
        const currentUser = auth.currentUser;

        messages.forEach(msg => {
            const isCurrentUser = currentUser && currentUser.uid === msg.userId;

            // Main message container
            const messageEl = document.createElement('div');
            messageEl.id = `msg-${msg.id}`;
            messageEl.className = `flex items-start gap-2 group ${isCurrentUser ? 'justify-end' : 'justify-start'}`;

            // Avatar
            const initial = msg.userName ? msg.userName.charAt(0).toUpperCase() : 'U';
            const avatar = document.createElement('div');
            avatar.className = `flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-gray-900 ${isCurrentUser ? 'bg-cyan-500' : 'bg-pink-500'}`;
            avatar.textContent = initial;

            // Content container (holds name, bubble, reply button)
            const contentContainer = document.createElement('div');
            contentContainer.className = `flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`;

            // User name
            const userNameEl = document.createElement('p');
            userNameEl.className = 'text-sm text-gray-400 mb-1 mx-2';
            userNameEl.textContent = msg.userName;
            contentContainer.appendChild(userNameEl);

            // Bubble container (holds bubble and reply button)
            const bubbleContainer = document.createElement('div');
            bubbleContainer.className = 'flex items-center gap-2';

            // Message Bubble
            const bubble = document.createElement('div');
            bubble.className = `max-w-xs md:max-w-md p-3 rounded-lg ${isCurrentUser ? 'bg-cyan-600 rounded-br-none' : 'bg-gray-700 rounded-bl-none'}`;
            
            // Handle Quoted Reply
            if (msg.replyToAuthor) {
                const replyQuote = document.createElement('div');
                replyQuote.className = 'mb-1 p-2 bg-gray-600 bg-opacity-50 rounded-lg border-l-2 border-cyan-400';
                const replyAuthor = document.createElement('p');
                replyAuthor.className = 'text-xs font-bold text-gray-400';
                replyAuthor.textContent = msg.replyToAuthor;
                const replyText = document.createElement('p');
                replyText.className = 'text-sm text-gray-300 truncate';
                replyText.textContent = msg.replyToText;
                replyQuote.appendChild(replyAuthor);
                replyQuote.appendChild(replyText);
                bubble.appendChild(replyQuote);
            }
            
            const messageText = document.createElement('p');
            messageText.className = 'text-white';
            messageText.textContent = msg.text;
            bubble.appendChild(messageText);

            // Reply Button
            const replyBtn = document.createElement('button');
            replyBtn.className = 'reply-btn opacity-0 group-hover:opacity-100 transition text-gray-400 hover:text-white';
            replyBtn.title = 'Reply to this message';
            replyBtn.innerHTML = '↵';
            replyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                setupReply(msg);
            });

            // Assemble the bubble container
            if (isCurrentUser) bubbleContainer.appendChild(replyBtn);
            bubbleContainer.appendChild(bubble);
            if (!isCurrentUser) bubbleContainer.appendChild(replyBtn);
            
            contentContainer.appendChild(bubbleContainer);
            
            // Assemble the final message element
            if (!isCurrentUser) messageEl.appendChild(avatar);
            messageEl.appendChild(contentContainer);
            if (isCurrentUser) messageEl.appendChild(avatar);
            
            messagesContainer.appendChild(messageEl);
        });

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
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

    if (commentForm) {
        commentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const messageInput = document.getElementById('message-input');
            const sendButton = document.getElementById('send-button');
            const messageText = messageInput.value.trim();
            const user = auth.currentUser;
            if (messageText && user) {
                messageInput.disabled = true;
                sendButton.disabled = true;
                sendButton.textContent = 'Sending...';
                try {
                    const userDocRef = db.collection('users').doc(user.uid);
                    const docSnap = await userDocRef.get();
                    if (docSnap.exists) {
                        const newMessage = { 
                            text: messageText, userName: docSnap.data().name, 
                            userId: user.uid, 
                            timestamp: firebase.firestore.FieldValue.serverTimestamp() 
                        };
                        if(replyingToMessage){
                            newMessage.replyToId = replyingToMessage.id;
                            newMessage.replyToAuthor = replyingToMessage.author;
                            newMessage.replyToText = replyingToMessage.text;
                        }
                        
                        const newDocRef = await db.collection('community-chat').add(newMessage);

                        if (messageText.trim().endsWith('?')) {
                            const questionData = {
                                messageId: newDocRef.id,
                                messageText: messageText.substring(0, 70) + (messageText.length > 70 ? '...' : '')
                            };
                            await userDocRef.update({
                                questionsAsked: firebase.firestore.FieldValue.increment(1),
                                questions: firebase.firestore.FieldValue.arrayUnion(questionData)
                            });
                        }

                        messageInput.value = '';
                        cancelReply();
                    } else { throw new Error("User profile not found."); }
                } catch (error) {
                    console.error("MESSAGE SEND FAILED:", error);
                } finally {
                    messageInput.disabled = false;
                    sendButton.disabled = false;
                    sendButton.textContent = 'Send';
                    messageInput.focus();
                }
            }
        });
    }
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

 