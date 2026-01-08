/**
 * Moonify App Core Logic
 * يدير هذا الملف واجهة المستخدم والمنطق الخاص بالخصوصية
 */

// State Management
let currentWallet = null;
let walletPassword = "";

// 1. التفاعل مع التبويبات (Tabs)
function showTab(tabId) {
    if (!currentWallet && tabId !== 'auth') return;

    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });

    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.style.display = 'block';
    }

    // تحديث القائمة الجانبية
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('onclick')?.includes(tabId)) {
            item.classList.add('active');
        }
    });

    if (tabId === 'dashboard') updateDashboard();
}

// 2. إدارة المحفظة (Wallet Management)
function checkExistingWallet() {
    const saved = localStorage.getItem('moonify_wallet_enc');
    if (saved) {
        document.getElementById('no-wallet').style.display = 'none';
        document.getElementById('has-wallet').style.display = 'block';
    }
}

async function createNewWallet() {
    const password = prompt("اختر كلمة مرور قوية (8 أحرف على الأقل):");
    if (!password || password.length < 8) return alert("كلمة المرور ضعيفة جداً");

    // توليد مفاتيح عشوائية
    const privateKey = ethers.hexlify(ethers.randomBytes(32));
    const wallet = new ethers.Wallet(privateKey);
    const address = wallet.address;
    const secret = ethers.hexlify(ethers.randomBytes(32));

    const walletData = {
        privateKey,
        address,
        secret,
        salt: 0,
        balance: 0,
        commitments: []
    };

    // تشفير وحفظ
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(walletData), password).toString();
    localStorage.setItem('moonify_wallet_enc', encrypted);

    currentWallet = walletData;
    walletPassword = password;

    alert("✅ تم إنشاء المحفظة بنجاح! احتفظ بكلمة المرور الخاصة بك.");
    document.getElementById('auth-screen').style.display = 'none';
    showTab('dashboard');
}

function unlockWallet() {
    const password = document.getElementById('wallet-password').value;
    const encrypted = localStorage.getItem('moonify_wallet_enc');

    try {
        const decrypted = CryptoJS.AES.decrypt(encrypted, password);
        const bytes = decrypted.toString(CryptoJS.enc.Utf8);

        if (!bytes) throw new Error();

        currentWallet = JSON.parse(bytes);
        walletPassword = password;

        document.getElementById('auth-screen').style.display = 'none';
        showTab('dashboard');
    } catch (e) {
        alert("❌ كلمة مرور خاطئة!");
    }
}

function lockWallet() {
    currentWallet = null;
    walletPassword = "";
    document.getElementById('auth-screen').style.display = 'block';
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    checkExistingWallet();
}

// 3. منطق الخصوصية (Privacy Logic)
function pedersenHash(inputs) {
    // محاكاة للـ hash المستخدم في ZK
    const combined = inputs.join("-");
    const hash = CryptoJS.SHA256(combined).toString();
    return "0x" + hash;
}

function updateDashboard() {
    if (!currentWallet) return;
    document.getElementById('private-balance').innerText = currentWallet.balance.toFixed(2);

    // عرض العنوان المقصوص
    const addr = currentWallet.address;
    document.getElementById('wallet-address').innerText = `${addr.substring(0, 10)}...${addr.substring(addr.length - 8)}`;
    document.getElementById('withdraw-address').value = addr; // تعبئة تلقائية لعنوان السحب
}

function copyAddress() {
    if (!currentWallet) return;
    navigator.clipboard.writeText(currentWallet.address);
    alert("✅ تم نسخ العنوان إلى الحافظة");
}

let secretVisible = false;
function toggleSecret() {
    secretVisible = !secretVisible;
    const el = document.getElementById('moonify-id');
    const btn = document.getElementById('toggle-btn');

    if (secretVisible) {
        el.innerText = currentWallet.secret;
        btn.innerText = "🫣";
    } else {
        el.innerText = "••••••••••••••••••••••••••••••••••••••••";
        btn.innerText = "👁️";
    }
}

function copySecret() {
    if (!currentWallet) return;
    navigator.clipboard.writeText(currentWallet.secret);
    alert("✅ تم نسخ Moonify ID الخاص بك!\nأعطه لمن يريد إرسال عملات لك بخصوصية.");
}

async function executeDeposit() {
    const amount = parseFloat(document.getElementById('deposit-amount').value);
    if (!amount || amount <= 0) return alert("أدخل مبلغ صحيح");

    console.log("🛠️ إنشاء Commitment...");
    const commitment = pedersenHash([amount.toString(), currentWallet.secret, currentWallet.salt.toString()]);

    // محاكاة إرسال المعاملة للبلوكتشين
    alert(`⏳ جارٍ الإيداع...\n\nCommitment: ${commitment.substring(0, 20)}...`);

    setTimeout(() => {
        currentWallet.balance += amount;
        currentWallet.commitments.push({
            commitment,
            amount,
            salt: currentWallet.salt,
            used: false
        });
        currentWallet.salt += 1;

        saveWalletState();
        updateDashboard();
        showTab('dashboard');
        alert("✅ تم الإيداع بنجاح في رصيدك الخاص!");
    }, 2000);
}

async function executeTransfer() {
    const amount = parseFloat(document.getElementById('send-amount').value);
    const recipientSecret = document.getElementById('send-recipient').value;

    if (!amount || amount > currentWallet.balance) return alert("رصيدك غير كافٍ أو المبلغ غير صحيح");
    if (!recipientSecret) return alert("أدخل سر المستقبِل");

    alert("🔐 جارٍ توليد Zero-Knowledge Proof...\nقد يستغرق هذا بضع ثوانٍ.");

    setTimeout(() => {
        // محاكاة عملية ZK
        currentWallet.balance -= amount;
        saveWalletState();
        updateDashboard();
        addHistoryItem("تحويل خاص", amount, "صادر");
        showTab('dashboard');
        alert(`✅ تم التحويل بنجاح وبخصوصية كاملة!\n\nالمبلغ: ${amount} MOON`);
    }, 2000);
}

async function executeWithdraw() {
    const amount = parseFloat(document.getElementById('withdraw-amount').value);
    const targetAddr = document.getElementById('withdraw-address').value;

    if (!amount || amount > currentWallet.balance) return alert("رصيدك غير كافٍ أو المبلغ غير صحيح");
    if (!ethers.isAddress(targetAddr)) return alert("عنوان المحفظة غير صحيح");

    alert("🔓 جارٍ فك التشفير وتوليد برهان السحب (Unshield Proof)...");

    setTimeout(() => {
        currentWallet.balance -= amount;
        saveWalletState();
        updateDashboard();
        addHistoryItem("سحب (Unshield)", amount, "صادر");
        showTab('dashboard');
        alert(`✅ تم السحب بنجاح!\nالمبلغ: ${amount} MOON\nإلى: ${targetAddr}`);
    }, 2500);
}

function saveWalletState() {
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(currentWallet), walletPassword).toString();
    localStorage.setItem('moonify_wallet_enc', encrypted);
}

function addHistoryItem(type, amount, direction) {
    const list = document.getElementById('history-list');
    if (list.innerHTML.includes("لا توجد عمليات")) list.innerHTML = "";

    const item = document.createElement('div');
    item.className = "action-card";
    item.style.marginBottom = "1rem";
    item.style.padding = "1rem";
    item.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong>${type}</strong>
                <div style="font-size: 0.8rem; color: var(--text-dim);">${new Date().toLocaleString()}</div>
            </div>
            <div style="color: ${direction === 'صادر' ? '#EF4444' : '#10B981'}">
                ${direction === 'صادر' ? '-' : '+'}${amount} MOON
            </div>
        </div>
    `;
    list.prepend(item);
}

// البدء
window.onload = checkExistingWallet;
