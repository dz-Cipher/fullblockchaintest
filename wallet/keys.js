/**
 * ==========================================
 * Moonify Keys - إدارة المفاتيح الخاصة
 * ==========================================
 * 
 * هذا الملف يدير:
 * 1. توليد مفاتيح خاصة وعامة
 * 2. توليد secrets للـ commitments
 * 3. حفظ وتحميل المفاتيح بشكل آمن
 * 4. تشفير المفاتيح
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const CryptoJS = require("crypto-js");

/**
 * توليد مفتاح خاص عشوائي
 */
function generatePrivateKey() {
    return "0x" + crypto.randomBytes(32).toString("hex");
}

/**
 * توليد secret عشوائي للـ commitments
 */
function generateSecret() {
    return "0x" + crypto.randomBytes(32).toString("hex");
}

/**
 * توليد salt عشوائي
 */
function generateSalt() {
    return Math.floor(Math.random() * 1000000);
}

/**
 * إنشاء محفظة جديدة
 */
function createWallet() {
    const privateKey = generatePrivateKey();
    const secret = generateSecret();
    const salt = 0; // نبدأ بـ salt = 0

    return {
        privateKey,    // للتوقيع على المعاملات
        secret,        // للـ commitments
        salt,          // يزيد مع كل معاملة
        commitments: [], // تتبع الـ commitments
        balance: 0     // الرصيد المحلي (تقديري)
    };
}

/**
 * تشفير بيانات المحفظة
 */
function encryptWallet(wallet, password) {
    const walletJson = JSON.stringify(wallet);
    const encrypted = CryptoJS.AES.encrypt(walletJson, password).toString();
    return encrypted;
}

/**
 * فك تشفير بيانات المحفظة
 */
function decryptWallet(encryptedData, password) {
    try {
        const decrypted = CryptoJS.AES.decrypt(encryptedData, password);
        const walletJson = decrypted.toString(CryptoJS.enc.Utf8);

        if (!walletJson) {
            throw new Error("كلمة مرور خاطئة");
        }

        return JSON.parse(walletJson);
    } catch (error) {
        throw new Error("فشل فك التشفير: " + error.message);
    }
}

/**
 * حفظ المحفظة في ملف
 */
function saveWallet(wallet, password, filename = "moonify-wallet.enc") {
    const keysDir = path.join(__dirname, "keys");

    // إنشاء مجلد keys إن لم يكن موجوداً
    if (!fs.existsSync(keysDir)) {
        fs.mkdirSync(keysDir, { recursive: true });
    }

    const filepath = path.join(keysDir, filename);
    const encrypted = encryptWallet(wallet, password);

    fs.writeFileSync(filepath, encrypted);

    return filepath;
}

/**
 * تحميل المحفظة من ملف
 */
function loadWallet(password, filename = "moonify-wallet.enc") {
    const filepath = path.join(__dirname, "keys", filename);

    if (!fs.existsSync(filepath)) {
        throw new Error("ملف المحفظة غير موجود");
    }

    const encrypted = fs.readFileSync(filepath, "utf8");
    const wallet = decryptWallet(encrypted, password);

    return wallet;
}

/**
 * التحقق من وجود محفظة
 */
function walletExists(filename = "moonify-wallet.enc") {
    const filepath = path.join(__dirname, "keys", filename);
    return fs.existsSync(filepath);
}

/**
 * تصدير المحفظة (JSON غير مشفر - للنسخ الاحتياطي)
 */
function exportWallet(wallet, filename = "moonify-wallet-backup.json") {
    const keysDir = path.join(__dirname, "keys");

    if (!fs.existsSync(keysDir)) {
        fs.mkdirSync(keysDir, { recursive: true });
    }

    const filepath = path.join(keysDir, filename);

    // إضافة تحذير
    const exportData = {
        WARNING: "⚠️ هذا الملف يحتوي على مفاتيحك الخاصة! احفظه بشكل آمن ولا تشاركه أبداً!",
        wallet: wallet,
        exportDate: new Date().toISOString()
    };

    fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));

    return filepath;
}

/**
 * استيراد محفظة من ملف JSON
 */
function importWallet(filepath) {
    if (!fs.existsSync(filepath)) {
        throw new Error("ملف الاستيراد غير موجود");
    }

    const data = JSON.parse(fs.readFileSync(filepath, "utf8"));

    if (!data.wallet) {
        throw new Error("ملف غير صالح");
    }

    return data.wallet;
}

/**
 * عرض معلومات المحفظة (بدون المفاتيح الحساسة)
 */
function displayWalletInfo(wallet) {
    console.log("\n📱 معلومات المحفظة:");
    console.log("   المفتاح الخاص: " + wallet.privateKey.substring(0, 10) + "..." + " (مخفي)");
    console.log("   السر: " + wallet.secret.substring(0, 10) + "..." + " (مخفي)");
    console.log("   Salt الحالي:", wallet.salt);
    console.log("   عدد Commitments:", wallet.commitments.length);
    console.log("   الرصيد التقديري:", wallet.balance);

    if (wallet.commitments.length > 0) {
        console.log("\n   📋 Commitments:");
        wallet.commitments.forEach((c, i) => {
            console.log(`      ${i + 1}. ${c.commitment.substring(0, 20)}...`);
            console.log(`         المبلغ: ${c.amount}, Used: ${c.used ? "نعم" : "لا"}`);
        });
    }
}

module.exports = {
    generatePrivateKey,
    generateSecret,
    generateSalt,
    createWallet,
    encryptWallet,
    decryptWallet,
    saveWallet,
    loadWallet,
    walletExists,
    exportWallet,
    importWallet,
    displayWalletInfo
};
