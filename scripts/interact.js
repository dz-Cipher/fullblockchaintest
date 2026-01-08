/**
 * ==========================================
 * سكربت التفاعل مع العقود المنشورة
 * ==========================================
 * 
 * هذا السكربت يتيح لك التفاعل مع العقود بعد نشرها
 * 
 * الاستخدام:
 * node scripts/interact.js
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * تحميل عناوين العقود المنشورة
 */
function loadDeployment(network) {
    const deploymentFile = path.join(
        __dirname,
        "..",
        "deployments",
        `${network}-deployment.json`
    );

    if (!fs.existsSync(deploymentFile)) {
        throw new Error(`لم يتم العثور على ملف النشر: ${deploymentFile}`);
    }

    return JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
}

/**
 * الحصول على معلومات العقود
 */
async function getContractsInfo(deployment) {
    console.log("==========================================");
    console.log("📋 معلومات العقود");
    console.log("==========================================\n");

    // الحصول على العقود
    const verifier = await hre.ethers.getContractAt(
        "UltraVerifier",
        deployment.contracts.UltraVerifier
    );

    const privatePool = await hre.ethers.getContractAt(
        "PrivatePool",
        deployment.contracts.PrivatePool
    );

    const privateToken = await hre.ethers.getContractAt(
        "PrivateToken",
        deployment.contracts.PrivateToken
    );

    // عرض المعلومات
    console.log("🔍 UltraVerifier:");
    console.log("   العنوان:", await verifier.getAddress());

    console.log("\n🏊 PrivatePool:");
    console.log("   العنوان:", await privatePool.getAddress());
    console.log("   المالك:", await privatePool.owner());
    console.log("   عدد المعاملات:", (await privatePool.transactionCount()).toString());
    console.log("   الرصيد:", hre.ethers.formatEther(await privatePool.getBalance()), "ETH");

    console.log("\n💎 PrivateToken:");
    console.log("   العنوان:", await privateToken.getAddress());
    console.log("   الاسم:", await privateToken.name());
    console.log("   الرمز:", await privateToken.symbol());
    console.log("   العرض الكلي:", hre.ethers.formatEther(await privateToken.totalSupply()), "PRIV");
    console.log("   عدد التحويلات الخاصة:", (await privateToken.privateTransferCount()).toString());

    console.log("");

    return { verifier, privatePool, privateToken };
}

/**
 * اختبار إيداع بسيط
 */
async function testDeposit(privatePool) {
    console.log("==========================================");
    console.log("🧪 اختبار الإيداع");
    console.log("==========================================\n");

    const [signer] = await hre.ethers.getSigners();

    // توليد commitment عشوائي (للاختبار)
    const randomCommitment = hre.ethers.randomBytes(32);
    const commitment = hre.ethers.hexlify(randomCommitment);

    console.log("📝 Commitment:", commitment);
    console.log("💰 المبلغ: 0.001 ETH\n");

    try {
        // إرسال معاملة الإيداع
        const tx = await privatePool.deposit(commitment, {
            value: hre.ethers.parseEther("0.001")
        });

        console.log("⏳ انتظار التأكيد...");
        console.log("   Hash:", tx.hash);

        const receipt = await tx.wait();

        console.log("✅ تم التأكيد!");
        console.log("   Block:", receipt.blockNumber);
        console.log("   Gas Used:", receipt.gasUsed.toString());

        // التحقق من commitment
        const isRegistered = await privatePool.isCommitmentRegistered(commitment);
        console.log("   Commitment مُسجل:", isRegistered ? "نعم ✅" : "لا ❌");

    } catch (error) {
        console.error("❌ خطأ:", error.message);
    }

    console.log("");
}

/**
 * عرض أحداث العقد
 */
async function showEvents(privatePool, privateToken) {
    console.log("==========================================");
    console.log("📜 آخر الأحداث");
    console.log("==========================================\n");

    // الحصول على آخر 5 أحداث deposit
    const depositFilter = privatePool.filters.Deposit();
    const depositEvents = await privatePool.queryFilter(depositFilter, -100);

    console.log("💰 أحداث الإيداع:", depositEvents.length);
    depositEvents.slice(-5).forEach((event, i) => {
        console.log(`   ${i + 1}. Commitment: ${event.args.commitment}`);
        console.log(`      Index: ${event.args.index.toString()}`);
    });

    // الحصول على آخر 5 أحداث private transfer
    const transferFilter = privatePool.filters.PrivateTransfer();
    const transferEvents = await privatePool.queryFilter(transferFilter, -100);

    console.log("\n🔒 أحداث التحويل الخاص:", transferEvents.length);
    transferEvents.slice(-5).forEach((event, i) => {
        console.log(`   ${i + 1}. Nullifier: ${event.args.nullifier.substring(0, 10)}...`);
    });

    console.log("");
}

/**
 * Main
 */
async function main() {
    console.log("==========================================");
    console.log("🚀 التفاعل مع العقود المنشورة");
    console.log("==========================================\n");

    const network = hre.network.name;
    console.log("📡 الشبكة:", network);
    console.log("");

    try {
        // تحميل معلومات النشر
        const deployment = loadDeployment(network);
        console.log("✅ تم تحميل معلومات النشر");
        console.log("   التاريخ:", deployment.timestamp);
        console.log("");

        // الحصول على معلومات العقود
        const contracts = await getContractsInfo(deployment);

        // اختبار الإيداع (اختياري - قم بإلغاء التعليق إذا أردت الاختبار)
        // await testDeposit(contracts.privatePool);

        // عرض الأحداث
        await showEvents(contracts.privatePool, contracts.privateToken);

        console.log("==========================================");
        console.log("✨ انتهى!");
        console.log("==========================================\n");

    } catch (error) {
        console.error("❌ خطأ:", error.message);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
