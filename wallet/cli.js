#!/usr/bin/env node

/**
 * ==========================================
 * Moonify CLI - المحفظة الخاصة
 * ==========================================
 * 
 * واجهة سطر أوامر لإدارة المحفظة الخاصة
 * 
 * الأوامر المتاحة:
 * - generate: إنشاء محفظة جديدة
 * - info: عرض معلومات المحفظة
 * - deposit: إيداع أموال
 * - transfer: تحويل خاص
 * - shield: تحويل توكنات إلى خاصة
 * - unshield: تحويل توكنات إلى عامة
 * - export: تصدير المحفظة
 * - import: استيراد محفظة
 */

const { Command } = require("commander");
const inquirer = require("inquirer");
const chalk = require("chalk");
const fs = require("fs");
const path = require("path");

// استيراد الوحدات
const keys = require("./keys");
const transaction = require("./transaction");
const prover = require("./prover");

const program = new Command();

// ==========================================
// إعدادات البرنامج
// ==========================================

program
    .name("moonify")
    .description("🌙 Moonify - محفظة خاصة مع Zero-Knowledge Proofs")
    .version("1.0.0");

// ==========================================
// الأمر: generate - إنشاء محفظة جديدة
// ==========================================

program
    .command("generate")
    .description("إنشاء محفظة Moonify جديدة")
    .action(async () => {
        console.log(chalk.blue("\n=".repeat(50)));
        console.log(chalk.blue.bold("🌙 إنشاء محفظة Moonify جديدة"));
        console.log(chalk.blue("=".repeat(50) + "\n"));

        // التحقق من وجود محفظة
        if (keys.walletExists()) {
            console.log(chalk.yellow("⚠️  يوجد محفظة بالفعل!"));
            const { overwrite } = await inquirer.prompt([{
                type: "confirm",
                name: "overwrite",
                message: "هل تريد استبدالها؟ (ستفقد المحفظة القديمة!)",
                default: false
            }]);

            if (!overwrite) {
                console.log(chalk.red("\n❌ تم الإلغاء\n"));
                return;
            }
        }

        // طلب كلمة مرور
        const { password, confirmPassword } = await inquirer.prompt([
            {
                type: "password",
                name: "password",
                message: "اختر كلمة مرور قوية:",
                mask: "*",
                validate: (input) => input.length >= 8 || "كلمة المرور يجب أن تكون 8 أحرف على الأقل"
            },
            {
                type: "password",
                name: "confirmPassword",
                message: "أعد كتابة كلمة المرور:",
                mask: "*"
            }
        ]);

        if (password !== confirmPassword) {
            console.log(chalk.red("\n❌ كلمات المرور غير متطابقة!\n"));
            return;
        }

        // إنشاء المحفظة
        console.log(chalk.cyan("\n🔐 توليد المفاتيح..."));
        const wallet = keys.createWallet();

        // حفظ المحفظة
        const filepath = keys.saveWallet(wallet, password);

        console.log(chalk.green("\n✅ تم إنشاء المحفظة بنجاح!"));
        console.log(chalk.dim("📁 الموقع:", filepath));

        // عرض المعلومات
        keys.displayWalletInfo(wallet);

        console.log(chalk.yellow("\n⚠️  ملاحظات مهمة:"));
        console.log(chalk.dim("   1. احفظ كلمة المرور بشكل آمن - لا يمكن استرجاعها!"));
        console.log(chalk.dim("   2. لا تشارك المفاتيح الخاصة مع أحد"));
        console.log(chalk.dim("   3. قم بعمل نسخة احتياطية:\n      node wallet/cli.js export\n"));
    });

// ==========================================
// الأمر: info - عرض معلومات المحفظة
// ==========================================

program
    .command("info")
    .description("عرض معلومات المحفظة")
    .action(async () => {
        try {
            const { password } = await inquirer.prompt([{
                type: "password",
                name: "password",
                message: "كلمة المرور:",
                mask: "*"
            }]);

            const wallet = keys.loadWallet(password);

            console.log(chalk.blue("\n=".repeat(50)));
            console.log(chalk.blue.bold("🌙 معلومات محفظة Moonify"));
            console.log(chalk.blue("=".repeat(50)));

            keys.displayWalletInfo(wallet);

            const availableBalance = transaction.getAvailableBalance(wallet);
            console.log(chalk.green("\n💰 الرصيد المتاح:", availableBalance));
            console.log();

        } catch (error) {
            console.log(chalk.red("\n❌ خطأ:", error.message, "\n"));
        }
    });

// ==========================================
// الأمر: deposit - إيداع
// ==========================================

program
    .command("deposit")
    .description("إنشاء معاملة إيداع")
    .option("-a, --amount <amount>", "المبلغ")
    .action(async (options) => {
        try {
            console.log(chalk.blue("\n=".repeat(50)));
            console.log(chalk.blue.bold("💰 إنشاء معاملة إيداع"));
            console.log(chalk.blue("=".repeat(50) + "\n"));

            // تحميل المحفظة
            const { password } = await inquirer.prompt([{
                type: "password",
                name: "password",
                message: "كلمة المرور:",
                mask: "*"
            }]);

            const wallet = keys.loadWallet(password);

            // الحصول على المبلغ
            let amount = options.amount;
            if (!amount) {
                const answer = await inquirer.prompt([{
                    type: "input",
                    name: "amount",
                    message: "المبلغ:",
                    validate: (input) => !isNaN(parseFloat(input)) || "أدخل رقماً صحيحاً"
                }]);
                amount = parseFloat(answer.amount);
            } else {
                amount = parseFloat(amount);
            }

            // بناء المعاملة
            const tx = transaction.buildDepositTransaction(
                amount,
                wallet.secret,
                wallet.salt
            );

            // عرض معلومات المعاملة
            transaction.displayTransactionInfo(tx);

            console.log(chalk.yellow("\n📋 هذه البيانات تحتاج للإرسال إلى العقد الذكي:"));
            console.log(chalk.dim("   Commitment:", tx.commitment));
            console.log(chalk.dim("   Amount:", amount, "ETH\n"));

            console.log(chalk.cyan("💡 للإرسال الفعلي إلى blockchain:"));
            console.log(chalk.dim("   استخدم: node scripts/interact.js"));
            console.log(chalk.dim("   أو: استخدم Hardhat console\n"));

            // تحديث المحفظة
            transaction.updateWalletAfterTransaction(wallet, tx);
            keys.saveWallet(wallet, password);

            console.log(chalk.green("✅ تم تحديث المحفظة محلياً\n"));

        } catch (error) {
            console.log(chalk.red("\n❌ خطأ:", error.message, "\n"));
        }
    });

// ==========================================
// الأمر: transfer - تحويل خاص
// ==========================================

program
    .command("transfer")
    .description("إنشاء معاملة تحويل خاصة")
    .option("-r, --recipient <secret>", "سر المستقبِل")
    .option("-a, --amount <amount>", "المبلغ")
    .action(async (options) => {
        try {
            console.log(chalk.blue("\n=".repeat(50)));
            console.log(chalk.blue.bold("🔒 إنشاء معاملة تحويل خاصة"));
            console.log(chalk.blue("=".repeat(50) + "\n"));

            // تحميل المحفظة
            const { password } = await inquirer.prompt([{
                type: "password",
                name: "password",
                message: "كلمة المرور:",
                mask: "*"
            }]);

            const wallet = keys.loadWallet(password);

            // عرض الرصيد المتاح
            const availableBalance = transaction.getAvailableBalance(wallet);
            console.log(chalk.cyan("💰 الرصيد المتاح:", availableBalance, "\n"));

            if (availableBalance === 0) {
                console.log(chalk.red("❌ لا يوجد رصيد!\n"));
                return;
            }

            // الحصول على المبلغ
            let amount = options.amount;
            if (!amount) {
                const answer = await inquirer.prompt([{
                    type: "input",
                    name: "amount",
                    message: "المبلغ المراد تحويله:",
                    validate: (input) => {
                        const val = parseFloat(input);
                        if (isNaN(val)) return "أدخل رقماً صحيحاً";
                        if (val > availableBalance) return "الرصيد غير كافٍ!";
                        return true;
                    }
                }]);
                amount = parseFloat(answer.amount);
            } else {
                amount = parseFloat(amount);
            }

            // الحصول على سر المستقبِل
            let recipientSecret = options.recipient;
            if (!recipientSecret) {
                const answer = await inquirer.prompt([{
                    type: "input",
                    name: "secret",
                    message: "سر المستقبِل (recipient secret):",
                    default: keys.generateSecret() // توليد سر عشوائي للتجربة
                }]);
                recipientSecret = answer.secret;
            }

            // بناء المعاملة
            console.log(chalk.cyan("\n🔨 بناء المعاملة..."));
            const tx = transaction.buildPrivateTransfer(wallet, recipientSecret, amount);

            // عرض معلومات المعاملة
            transaction.displayTransactionInfo(tx);

            // توليد البرهان
            console.log(chalk.cyan("\n🔐 توليد Zero-Knowledge Proof..."));
            const proof = await prover.generateProof({
                secret: tx.private.secret,
                balance: tx.private.balance,
                amount: tx.private.amount,
                recipient_secret: tx.private.recipientSecret,
                salt: tx.private.salt,
                old_commitment: tx.oldCommitment,
                nullifier: tx.nullifier,
                sender_new_commitment: tx.senderNewCommitment,
                recipient_commitment: tx.recipientCommitment
            });

            console.log(chalk.yellow("\n📋 البيانات للإرسال إلى Blockchain:"));
            console.log(chalk.dim("   Proof:", proof.proof.substring(0, 50) + "..."));
            console.log(chalk.dim("   Public Inputs:", proof.publicInputs.length, "items\n"));

            // تحديث المحفظة
            transaction.updateWalletAfterTransaction(wallet, tx);
            keys.saveWallet(wallet, password);

            console.log(chalk.green("✅ تم! المعاملة جاهزة للإرسال\n"));
            console.log(chalk.cyan("💡 للإرسال الفعلي:"));
            console.log(chalk.dim("   استخدم: node scripts/interact.js\n"));

        } catch (error) {
            console.log(chalk.red("\n❌ خطأ:", error.message, "\n"));
        }
    });

// ==========================================
// الأمر: export - تصدير المحفظة
// ==========================================

program
    .command("export")
    .description("تصدير المحفظة (نسخة احتياطية)")
    .action(async () => {
        try {
            const { password } = await inquirer.prompt([{
                type: "password",
                name: "password",
                message: "كلمة المرور:",
                mask: "*"
            }]);

            const wallet = keys.loadWallet(password);
            const filepath = keys.exportWallet(wallet);

            console.log(chalk.green("\n✅ تم تصدير المحفظة!"));
            console.log(chalk.dim("📁 الموقع:", filepath));
            console.log(chalk.yellow("\n⚠️  تحذير: هذا الملف يحتوي على مفاتيحك الخاصة!"));
            console.log(chalk.dim("   - احفظه في مكان آمن"));
            console.log(chalk.dim("   - لا تشاركه مع أحد"));
            console.log(chalk.dim("   - احذفه بعد النسخ الاحتياطي\n"));

        } catch (error) {
            console.log(chalk.red("\n❌ خطأ:", error.message, "\n"));
        }
    });

// ==========================================
// الأمر: import - استيراد محفظة
// ==========================================

program
    .command("import <filepath>")
    .description("استيراد محفظة من ملف")
    .action(async (filepath) => {
        try {
            console.log(chalk.cyan("\n📥 استيراد المحفظة...\n"));

            const wallet = keys.importWallet(filepath);

            const { password, confirmPassword } = await inquirer.prompt([
                {
                    type: "password",
                    name: "password",
                    message: "اختر كلمة مرور جديدة:",
                    mask: "*",
                    validate: (input) => input.length >= 8 || "8 أحرف على الأقل"
                },
                {
                    type: "password",
                    name: "confirmPassword",
                    message: "أعد كتابة كلمة المرور:",
                    mask: "*"
                }
            ]);

            if (password !== confirmPassword) {
                console.log(chalk.red("\n❌ كلمات المرور غير متطابقة!\n"));
                return;
            }

            keys.saveWallet(wallet, password);

            console.log(chalk.green("\n✅ تم استيراد المحفظة بنجاح!"));
            keys.displayWalletInfo(wallet);
            console.log();

        } catch (error) {
            console.log(chalk.red("\n❌ خطأ:", error.message, "\n"));
        }
    });

// ==========================================
// الأمر: help - المساعدة
// ==========================================

program
    .command("guide")
    .description("دليل الاستخدام الكامل")
    .action(() => {
        console.log(chalk.blue("\n" + "=".repeat(60)));
        console.log(chalk.blue.bold("🌙 دليل استخدام Moonify Wallet"));
        console.log(chalk.blue("=".repeat(60) + "\n"));

        console.log(chalk.cyan("📖 نظرة عامة:"));
        console.log(chalk.dim("   Moonify هي محفظة خاصة تستخدم Zero-Knowledge Proofs"));
        console.log(chalk.dim("   لحماية خصوصيتك الكاملة عند إرسال المعاملات.\n"));

        console.log(chalk.cyan("🚀 البدء السريع:\n"));

        console.log(chalk.white("1️⃣ إنشاء محفظة جديدة:"));
        console.log(chalk.dim("   node wallet/cli.js generate\n"));

        console.log(chalk.white("2️⃣ عرض معلومات المحفظة:"));
        console.log(chalk.dim("   node wallet/cli.js info\n"));

        console.log(chalk.white("3️⃣ إنشاء معاملة إيداع:"));
        console.log(chalk.dim("   node wallet/cli.js deposit --amount 0.1\n"));

        console.log(chalk.white("4️⃣ إنشاء تحويل خاص:"));
        console.log(chalk.dim("   node wallet/cli.js transfer --amount 0.05\n"));

        console.log(chalk.white("5️⃣ نسخة احتياطية:"));
        console.log(chalk.dim("   node wallet/cli.js export\n"));

        console.log(chalk.cyan("🔐 الخصوصية:"));
        console.log(chalk.dim("   - جميع معاملاتك مخفية تماماً"));
        console.log(chalk.dim("   - لا أحد يعرف: من أرسل، لمن، أو كم"));
        console.log(chalk.dim("   - فقط أنت والمستقبِل تعرفون (محلياً)\n"));

        console.log(chalk.yellow("⚠️  ملاحظات مهمة:"));
        console.log(chalk.dim("   - احفظ كلمة المرور - لا يمكن استرجاعها!"));
        console.log(chalk.dim("   - لا تشارك المفاتيح الخاصة أبداً"));
        console.log(chalk.dim("   - قم بنسخة احتياطية بشكل دوري\n"));

        prover.printNoirUsageGuide();
    });

// ==========================================
// التنفيذ
// ==========================================

program.parse();

// إذا لم يتم تمرير أوامر، عرض المساعدة
if (!process.argv.slice(2).length) {
    console.log(chalk.blue("\n🌙 " + chalk.bold("Moonify Wallet") + " - محفظة خاصة مع Zero-Knowledge Proofs\n"));
    program.outputHelp();
    console.log(chalk.cyan("\n💡 نصيحة: استخدم 'node wallet/cli.js guide' للدليل الكامل\n"));
}
