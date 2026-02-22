// Instagram Private Viewer - Pentest Tool
async function analyzeProfile() {
    const url = document.getElementById('profileUrl').value;
    if (!url) return alert('Profile URL required');
    
    const username = url.match(/instagram\.com\/([^\/]+)/)?.[1];
    if (!username) return alert('Invalid Instagram URL');
    
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('results').classList.add('hidden');
}

async function loginInstagram() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) return alert('Login credentials required');
    
    showLoader();
    
    // Step 1: Get CSRF Token & Initial Cookies
    try {
        const csrfResponse = await fetch('https://www.instagram.com/accounts/login/', {
            credentials: 'include'
        });
        const cookies = csrfResponse.headers.get('set-cookie');
        const csrfMatch = cookies?.match(/csrftoken=([^;]+)/);
        const csrfToken = csrfMatch ? csrfMatch[1] : '';
        
        // Step 2: Login Request
        const loginData = new FormData();
        loginData.append('username', username);
        loginData.append('enc_password', `#PWD_INSTAGRAM_BROWSER:${Date.now()}:${btoa(password)}`);
        loginData.append('queryParams', '{}');
        loginData.append('optIntoOneTap', 'false');
        
        const loginResponse = await fetch('https://www.instagram.com/accounts/login/ajax/', {
            method: 'POST',
            credentials: 'include',
            headers: { 'X-CSRFToken': csrfToken, 'X-Requested-With': 'XMLHttpRequest' },
            body: loginData
        });
        
        const loginResult = await loginResponse.json();
        
        if (loginResult.authenticated) {
            showProfile(username);
        } else {
            hideLoader();
            alert('Login failed: ' + (loginResult.message || 'Invalid credentials'));
        }
    } catch (error) {
        hideLoader();
        alert('Error: ' + error.message);
    }
}

async function showProfile(username) {
    try {
        // Get user ID first
        const profileResponse = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`, {
            credentials: 'include'
        });
        const profileData = await profileResponse.json();
        const userId = profileData.data.user.id;
        
        showProfileInfo(profileData.data.user);
        
        // Fetch posts via GraphQL
        const queryHash = 'd5d763b1e2acf209d62d22cf78de539d'; // User media hash
        const variables = { "id": userId, "first": 12 };
        
        const postsResponse = await fetch(`https://www.instagram.com/graphql/query/?query_hash=${queryHash}&variables=${encodeURIComponent(JSON.stringify(variables))}`, {
            credentials: 'include'
        });
        
        const postsData = await postsResponse.json();
        displayPosts(postsData.data.user.edge_owner_to_timeline_media.edges);
        
    } catch (error) {
        document.getElementById('profile-info').innerHTML = `<p class="error">Profile access failed: ${error.message}</p>`;
    }
    hideLoader();
}

function showProfileInfo(user) {
    document.getElementById('profile-info').innerHTML = `
        <div class="profile-header">
            <img src="${user.profile_pic_url}" width="80" height="80" style="border-radius: 50%;">
            <h4>${user.full_name || user.username}</h4>
            <p>@${user.username} | Private: ${user.is_private ? 'Yes' : 'No'}</p>
            <p>Followers: ${user.edge_followed_by.count.toLocaleString()}</p>
        </div>
    `;
}

function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    if (!posts || posts.length === 0) {
        container.innerHTML = '<p>No posts found or private content restricted</p>';
        return;
    }
    
    container.innerHTML = posts.map(edge => {
        const node = edge.node;
        return `
            <div class="post">
                <img src="${node.display_url}" alt="Post" loading="lazy">
                <p>${node.edge_media_to_caption.edges[0]?.node.text || 'No caption'}</p>
                <small>${node.taken_at_timestamp} | Likes: ${node.edge_liked_by.count}</small>
            </div>
        `;
    }).join('');
}

function showLoader() {
    document.getElementById('results').innerHTML = '<div class="loader">🔄 Analyzing private profile...</div>';
    document.getElementById('results').classList.remove('hidden');
}

function hideLoader() {
    // Loader auto-hides
}

document.getElementById('profileUrl').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') analyzeProfile();
});
