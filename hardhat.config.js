// تحميل المتغيرات من ملف .env
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// المفتاح الخاص للمحفظة (للنشر على testnet)
// تأكد من عدم مشاركة هذا المفتاح أبداً!
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";

// RPC URLs للشبكات المختلفة
const SEPOLIA_RPC = process.env.SEPOLIA_RPC || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY";

// Etherscan API key للتحقق من العقود
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    // إصدار Solidity المستخدم
    solidity: {
        version: "0.8.24",
        settings: {
            optimizer: {
                enabled: true,  // تفعيل المحسن لتقليل gas
                runs: 200       // عدد المرات المتوقع تشغيل العقد
            },
            viaIR: true       // استخدام intermediate representation لتحسين أفضل
        }
    },

    // تكوين الشبكات
    networks: {
        // شبكة محلية للتطوير (hardhat node)
        hardhat: {
            chainId: 31337,
            // gas: 12000000,
            // blockGasLimit: 12000000
        },

        // شبكة محلية (إذا كنت تستخدم hardhat node في terminal منفصل)
        localhost: {
            url: "http://127.0.0.1:8545",
            chainId: 31337
        },

        // Sepolia testnet - شبكة اختبار Ethereum
        sepolia: {
            url: SEPOLIA_RPC,
            accounts: [PRIVATE_KEY],
            chainId: 11155111,
            // gas: "auto",          // حساب gas تلقائياً
            // gasPrice: "auto"      // حساب سعر gas تلقائياً
        }
    },

    // تكوين Etherscan للتحقق من العقود
    etherscan: {
        apiKey: {
            sepolia: ETHERSCAN_API_KEY
        }
    },

    // مسارات المشروع
    paths: {
        sources: "./contracts",    // مجلد العقود الذكية
        tests: "./test",           // مجلد الاختبارات
        cache: "./cache",          // مجلد الـ cache
        artifacts: "./artifacts"   // مجلد المخرجات المجمّعة
    },

    // إعدادات gas reporter (مفيد لمعرفة تكلفة كل function)
    gasReporter: {
        enabled: process.env.REPORT_GAS === "true",
        currency: "USD",
        // coinmarketcap: process.env.COINMARKETCAP_API_KEY
    }
};
