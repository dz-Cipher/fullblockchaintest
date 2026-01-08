/**
 * ==========================================
 * سكربت اختبار البراهين (Proofs)
 * ==========================================
 * 
 * هذا السكربت يختبر توليد البراهين محلياً قبل الإرسال إلى blockchain
 * 
 * الوظائف:
 * 1. توليد بيانات اختبارية
 * 2. حساب commitments و nullifiers
 * 3. محاكاة دائرة Noir
 * 4. عرض النتائج
 * 
 * ملاحظة: هذا إصدار مبسط للتوضيح
 * للاستخدام الحقيقي، يجب استخدام Noir prover
 * 
 * الاستخدام:
 * node scripts/test-proof.js
 */

const { ethers } = require("ethers");
const crypto = require("crypto");

/**
 * حساب Pedersen Hash (مبسط للتوضيح)
 * في الواقع، يجب استخدام المكتبة الحقيقية من Noir
 */
function pedersenHash(inputs) {
    // هذه نسخة مبسطة جداً - للتوضيح فقط!
    // في الإنتاج، استخدم المكتبة الحقيقية

    const combined = inputs.join("-");
    const hash = crypto.createHash("sha256").update(combined).digest();
    return "0x" + hash.toString("hex");
}

/**
 * توليد commitment
 */
function generateCommitment(balance, secret, salt) {
    console.log("   📊 المدخلات:");
    console.log("      - الرصيد:", balance);
    console.log("      - السر:", secret.substring(0, 10) + "...");
    console.log("      - الملح:", salt);

    const commitment = pedersenHash([balance, secret, salt]);
    console.log("   ✅ Commitment:", commitment);

    return commitment;
}

/**
 * توليد nullifier
 */
function generateNullifier(secret, salt) {
    const nullifier = pedersenHash([secret, salt, "1337"]);
    console.log("   ✅ Nullifier:", nullifier);

    return nullifier;
}

/**
 * محاكاة دائرة Noir
 */
function simulateCircuit(inputs) {
    console.log("\n🔄 محاكاة الدائرة (Circuit Simulation)...\n");

    const {
        secret,
        balance,
        amount,
        recipientSecret,
        salt
    } = inputs;

    // الخطوة 1: التحقق من الـ commitment القديم
    console.log("1️⃣ التحقق من Old Commitment:");
    const oldCommitment = generateCommitment(balance, secret, salt);

    // الخطوة 2: توليد nullifier
    console.log("\n2️⃣ توليد Nullifier:");
    const nullifier = generateNullifier(secret, salt);

    // الخطوة 3: التحقق من كفاية الرصيد
    console.log("\n3️⃣ التحقق من الرصيد:");
    console.log("   الرصيد الحالي:", balance);
    console.log("   المبلغ المطلوب:", amount);

    if (balance < amount) {
        console.log("   ❌ فشل: الرصيد غير كافي!");
        return null;
    }
    console.log("   ✅ الرصيد كافٍ");

    // الخطوة 4: حساب الرصيد الجديد
    const newBalance = balance - amount;
    console.log("\n4️⃣ حساب الرصيد الجديد:");
    console.log("   الرصيد الجديد:", newBalance);

    // الخطوة 5: توليد commitment جديد للمُرسل
    console.log("\n5️⃣ توليد Sender New Commitment:");
    const newSalt = salt + 1;
    const senderNewCommitment = generateCommitment(newBalance, secret, newSalt);

    // الخطوة 6: توليد commitment للمُستقبِل
    console.log("\n6️⃣ توليد Recipient Commitment:");
    const recipientCommitment = generateCommitment(amount, recipientSecret, 0);

    return {
        oldCommitment,
        nullifier,
        senderNewCommitment,
        recipientCommitment,
        // البيانات الخاصة (لا تُرسل أبداً!)
        privateInputs: {
            secret,
            balance,
            amount,
            recipientSecret,
            salt
        }
    };
}

/**
 * عرض النتائج
 */
function displayResults(result) {
    if (!result) {
        console.log("\n❌ فشلت المحاكاة!");
        return;
    }

    console.log("\n==========================================");
    console.log("✨ نجحت المحاكاة!");
    console.log("==========================================\n");

    console.log("📤 البيانات العامة (يمكن إرسالها إلى blockchain):");
    console.log("   Old Commitment:        ", result.oldCommitment);
    console.log("   Nullifier:             ", result.nullifier);
    console.log("   Sender New Commitment: ", result.senderNewCommitment);
    console.log("   Recipient Commitment:  ", result.recipientCommitment);

    console.log("\n🔒 البيانات الخاصة (لا تُرسل أبداً!):");
    console.log("   Secret:                ", result.privateInputs.secret.substring(0, 10) + "...");
    console.log("   Balance:               ", result.privateInputs.balance);
    console.log("   Amount:                ", result.privateInputs.amount);
    console.log("   Recipient Secret:      ", result.privateInputs.recipientSecret.substring(0, 10) + "...");
    console.log("   Salt:                  ", result.privateInputs.salt);

    console.log("\n==========================================");
    console.log("📋 ماذا يحدث على Blockchain؟");
    console.log("==========================================\n");

    console.log("✅ المرئي على السلسلة:");
    console.log("   - تم استخدام nullifier جديد");
    console.log("   - تم تسجيل commitments جديدة");
    console.log("   - حدثت معاملة (transaction)");

    console.log("\n❌ المخفي تماماً:");
    console.log("   - من أرسل؟ (المُرسل مخفي)");
    console.log("   - لمن؟ (المُستقبِل مخفي)");
    console.log("   - كم أرسل؟ (المبلغ مخفي)");
    console.log("   - كم متبقي؟ (الرصيد مخفي)");

    console.log("\n💡 هذه هي قوة Zero-Knowledge Proofs! 💡\n");
}

/**
 * اختبار سيناريو كامل
 */
function testScenario() {
    console.log("==========================================");
    console.log("🧪 اختبار البراهين - سيناريو كامل");
    console.log("==========================================\n");

    console.log("📖 السيناريو:");
    console.log("   - أليس لديها 100 وحدة");
    console.log("   - تريد إرسال 30 وحدة لبوب");
    console.log("   - يجب أن يتبقى لها 70 وحدة\n");

    // توليد بيانات اختبارية
    const aliceSecret = "0x" + crypto.randomBytes(32).toString("hex");
    const bobSecret = "0x" + crypto.randomBytes(32).toString("hex");

    const testInputs = {
        secret: aliceSecret,           // سر أليس
        balance: 100,                  // رصيد أليس
        amount: 30,                    // المبلغ المُحوَّل
        recipientSecret: bobSecret,    // سر بوب
        salt: 0                        // الملح الأولي
    };

    // تشغيل المحاكاة
    const result = simulateCircuit(testInputs);

    // عرض النتائج
    displayResults(result);
}

/**
 * اختبار حالة فشل (رصيد غير كافٍ)
 */
function testFailureCase() {
    console.log("\n==========================================");
    console.log("🧪 اختبار حالة الفشل");
    console.log("==========================================\n");

    console.log("📖 السيناريو:");
    console.log("   - أليس لديها 10 وحدات فقط");
    console.log("   - تحاول إرسال 50 وحدة");
    console.log("   - يجب أن تفشل العملية!\n");

    const aliceSecret = "0x" + crypto.randomBytes(32).toString("hex");
    const bobSecret = "0x" + crypto.randomBytes(32).toString("hex");

    const testInputs = {
        secret: aliceSecret,
        balance: 10,                   // رصيد قليل
        amount: 50,                    // مبلغ كبير
        recipientSecret: bobSecret,
        salt: 0
    };

    const result = simulateCircuit(testInputs);

    if (!result) {
        console.log("\n✅ نجح الاختبار: تم رفض المعاملة كما هو متوقع!");
    }
}

/**
 * معلومات إضافية
 */
function showAdditionalInfo() {
    console.log("\n==========================================");
    console.log("📚 معلومات إضافية");
    console.log("==========================================\n");

    console.log("🔧 للاستخدام الحقيقي مع Noir:\n");

    console.log("1. بناء الدائرة:");
    console.log("   cd circuits");
    console.log("   nargo compile\n");

    console.log("2. توليد proof حقيقي:");
    console.log("   nargo prove\n");

    console.log("3. التحقق من proof:");
    console.log("   nargo verify\n");

    console.log("4. توليد verifier contract:");
    console.log("   nargo codegen-verifier\n");

    console.log("⚠️  ملاحظة:");
    console.log("   هذا السكربت مبسط للتوضيح فقط");
    console.log("   للإنتاج، استخدم أدوات Noir الحقيقية\n");
}

// ==========================================
// Main
// ==========================================

async function main() {
    try {
        // اختبار السيناريو الناجح
        testScenario();

        // اختبار حالة الفشل
        testFailureCase();

        // معلومات إضافية
        showAdditionalInfo();

    } catch (error) {
        console.error("\n❌ خطأ:", error.message);
        process.exit(1);
    }
}

main();
