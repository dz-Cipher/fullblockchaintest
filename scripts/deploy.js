/**
 * ==========================================
 * سكربت نشر العقود الذكية
 * ==========================================
 * 
 * هذا السكربت ينشر جميع العقود بالترتيب الصحيح:
 * 1. UltraVerifier (عقد التحقق من البراهين)
 * 2. PrivatePool (مجمع المعاملات الخاصة)
 * 3. PrivateToken (التوكن الخاص)
 * 
 * الاستخدام:
 * npm run deploy:local     - للنشر على شبكة محلية
 * npm run deploy:sepolia   - للنشر على Sepolia testnet
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("==========================================");
    console.log("🚀 بدء نشر العقود الذكية");
    console.log("==========================================\n");

    // الحصول على الحساب الذي سينشر العقود
    const [deployer] = await hre.ethers.getSigners();
    console.log("📋 عنوان الناشر:", deployer.address);

    // الحصول على رصيد الناشر
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("💰 الرصيد:", hre.ethers.formatEther(balance), "ETH\n");

    // التحقق من كفاية الرصيد
    if (balance === 0n) {
        console.error("❌ خطأ: الرصيد = 0!");
        console.log("💡 احصل على ETH من faucet:");
        console.log("   - Sepolia: https://sepoliafaucet.com");
        console.log("   - أو: https://www.alchemy.com/faucets/ethereum-sepolia");
        process.exit(1);
    }

    // ==========================================
    // الخطوة 1: نشر UltraVerifier
    // ==========================================
    console.log("📝 الخطوة 1/3: نشر UltraVerifier...");

    const UltraVerifier = await hre.ethers.getContractFactory("UltraVerifier");
    const verifier = await UltraVerifier.deploy();
    await verifier.waitForDeployment();

    const verifierAddress = await verifier.getAddress();
    console.log("✅ UltraVerifier منشور على:", verifierAddress);
    console.log("");

    // ==========================================
    // الخطوة 2: نشر PrivatePool
    // ==========================================
    console.log("📝 الخطوة 2/3: نشر PrivatePool...");

    const PrivatePool = await hre.ethers.getContractFactory("PrivatePool");
    const privatePool = await PrivatePool.deploy(verifierAddress);
    await privatePool.waitForDeployment();

    const privatePoolAddress = await privatePool.getAddress();
    console.log("✅ PrivatePool منشور على:", privatePoolAddress);
    console.log("");

    // ==========================================
    // الخطوة 3: نشر PrivateToken
    // ==========================================
    console.log("📝 الخطوة 3/3: نشر MoonToken...");

    // العرض الأولي: 2,000,000,000 MOON (2 مليار - 18 decimals)
    const initialSupply = hre.ethers.parseEther("2000000000");

    const MoonToken = await hre.ethers.getContractFactory("MoonToken");
    const privateToken = await MoonToken.deploy(verifierAddress, initialSupply);
    await privateToken.waitForDeployment();

    const privateTokenAddress = await privateToken.getAddress();
    console.log("✅ MoonToken منشور على:", privateTokenAddress);
    console.log("");

    // ==========================================
    // ملخص النشر
    // ==========================================
    console.log("==========================================");
    console.log("✨ تم النشر بنجاح!");
    console.log("==========================================\n");

    const deploymentInfo = {
        network: hre.network.name,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            UltraVerifier: verifierAddress,
            PrivatePool: privatePoolAddress,
            MoonToken: privateTokenAddress
        },
        tokenInfo: {
            name: "Moonify Token",
            symbol: "MOON",
            decimals: 18,
            initialSupply: "2000000000"
        }
    };

    console.log("📋 معلومات النشر:");
    console.log("   الشبكة:", deploymentInfo.network);
    console.log("   الناشر:", deploymentInfo.deployer);
    console.log("");
    console.log("📍 عناوين العقود:");
    console.log("   UltraVerifier:", verifierAddress);
    console.log("   PrivatePool:  ", privatePoolAddress);
    console.log("   MoonToken:    ", privateTokenAddress);
    console.log("");
    console.log("💎 معلومات التوكن:");
    console.log("   الاسم:", deploymentInfo.tokenInfo.name);
    console.log("   الرمز:", deploymentInfo.tokenInfo.symbol);
    console.log("   العرض الأولي:", deploymentInfo.tokenInfo.initialSupply, "MOON");
    console.log("");

    // ==========================================
    // حفظ العناوين
    // ==========================================
    const deploymentsDir = path.join(__dirname, "..", "deployments");

    // إنشاء مجلد deployments إن لم يكن موجوداً
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    // حفظ العناوين في ملف JSON
    const deploymentFile = path.join(
        deploymentsDir,
        `${hre.network.name}-deployment.json`
    );

    fs.writeFileSync(
        deploymentFile,
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("💾 تم حفظ العناوين في:", deploymentFile);
    console.log("");

    // ==========================================
    // تعليمات التحقق (للـ testnet)
    // ==========================================
    if (hre.network.name === "sepolia") {
        console.log("==========================================");
        console.log("🔍 للتحقق من العقود على Etherscan:");
        console.log("==========================================\n");

        console.log("npx hardhat verify --network sepolia", verifierAddress);
        console.log("npx hardhat verify --network sepolia", privatePoolAddress, verifierAddress);
        console.log("npx hardhat verify --network sepolia", privateTokenAddress, verifierAddress, initialSupply.toString());
        console.log("");
    }

    // ==========================================
    // تعليمات التفاعل
    // ==========================================
    console.log("==========================================");
    console.log("📱 الخطوات التالية:");
    console.log("==========================================\n");

    console.log("1️⃣ اختبار العقود:");
    console.log("   npx hardhat test\n");

    console.log("2️⃣ تجربة المحفظة:");
    console.log("   node wallet/cli.js generate\n");

    console.log("3️⃣ إنشاء معاملة خاصة:");
    console.log("   node wallet/cli.js deposit --amount 0.1\n");

    console.log("4️⃣ عرض العقود على blockchain explorer:");
    if (hre.network.name === "sepolia") {
        console.log("   UltraVerifier: https://sepolia.etherscan.io/address/" + verifierAddress);
        console.log("   PrivatePool:   https://sepolia.etherscan.io/address/" + privatePoolAddress);
        console.log("   PrivateToken:  https://sepolia.etherscan.io/address/" + privateTokenAddress);
    } else {
        console.log("   (متاح فقط على testnet/mainnet)");
    }

    console.log("");
    console.log("✨ استمتع بالخصوصية الكاملة! ✨");
    console.log("");
}

// تشغيل السكربت
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ خطأ في النشر:");
        console.error(error);
        process.exit(1);
    });
