/**
 * ==========================================
 * Moonify Transaction Builder
 * ==========================================
 * 
 * هذا الملف يبني المعاملات الخاصة:
 * 1. حساب commitments
 * 2. حساب nullifiers
 * 3. تجهيز inputs للدائرة
 * 4. بناء المعاملة النهائية
 */

const crypto = require("crypto");

/**
 * حساب Pedersen Hash (مبسط)
 * في الإنتاج، استخدم المكتبة الحقيقية من Noir
 */
function pedersenHash(inputs) {
    // نسخة مبسطة للتوضيح
    const combined = inputs.join("-");
    const hash = crypto.createHash("sha256").update(combined).digest();
    return "0x" + hash.toString("hex");
}

/**
 * حساب commitment
 */
function calculateCommitment(amount, secret, salt) {
    return pedersenHash([amount.toString(), secret, salt.toString()]);
}

/**
 * حساب nullifier
 */
function calculateNullifier(secret, salt) {
    return pedersenHash([secret, salt.toString(), "1337"]);
}

/**
 * بناء معاملة إيداع (deposit)
 */
function buildDepositTransaction(amount, secret, salt = 0) {
    const commitment = calculateCommitment(amount, secret, salt);

    return {
        type: "deposit",
        commitment,
        amount,
        // البيانات الخاصة (لا تُرسل!)
        private: {
            secret,
            salt
        }
    };
}

/**
 * بناء معاملة تحويل خاصة
 */
function buildPrivateTransfer(senderWallet, recipientSecret, amount) {
    // البحث عن commitment مناسب (غير مستخدم ورصيده كافٍ)
    const availableCommitment = senderWallet.commitments.find(
        c => !c.used && c.amount >= amount
    );

    if (!availableCommitment) {
        throw new Error("لا يوجد رصيد كافٍ");
    }

    // المعلومات القديمة
    const oldCommitment = availableCommitment.commitment;
    const oldAmount = availableCommitment.amount;
    const oldSalt = availableCommitment.salt;

    // حساب nullifier للـ commitment القديم
    const nullifier = calculateNullifier(senderWallet.secret, oldSalt);

    // حساب الرصيد الجديد للمُرسل
    const newSenderAmount = oldAmount - amount;
    const newSenderSalt = oldSalt + 1;

    // commitment جديد للمُرسل (للرصيد المتبقي)
    let senderNewCommitment = "0x" + "0".repeat(64); // null commitment
    if (newSenderAmount > 0) {
        senderNewCommitment = calculateCommitment(
            newSenderAmount,
            senderWallet.secret,
            newSenderSalt
        );
    }

    // commitment للمستقبِل
    const recipientCommitment = calculateCommitment(amount, recipientSecret, 0);

    return {
        type: "private_transfer",
        // Public inputs
        oldCommitment,
        nullifier,
        senderNewCommitment,
        recipientCommitment,
        // Private inputs (للـ proof generation)
        private: {
            secret: senderWallet.secret,
            balance: oldAmount,
            amount: amount,
            recipientSecret: recipientSecret,
            salt: oldSalt
        },
        // معلومات للتتبع المحلي
        meta: {
            oldAmount,
            newSenderAmount,
            newSenderSalt,
            commitmentIndex: senderWallet.commitments.indexOf(availableCommitment)
        }
    };
}

/**
 * بناء معاملة shield (تحويل توكنات عامة إلى خاصة)
 */
function buildShieldTransaction(amount, secret, salt = 0) {
    const commitment = calculateCommitment(amount, secret, salt);

    return {
        type: "shield",
        commitment,
        amount,
        private: {
            secret,
            salt
        }
    };
}

/**
 * بناء معاملة unshield (تحويل توكنات خاصة إلى عامة)
 */
function buildUnshieldTransaction(wallet, amount) {
    // البحث عن commitment مناسب
    const availableCommitment = wallet.commitments.find(
        c => !c.used && c.amount >= amount
    );

    if (!availableCommitment) {
        throw new Error("لا يوجد رصيد خاص كافٍ");
    }

    const nullifier = calculateNullifier(wallet.secret, availableCommitment.salt);

    return {
        type: "unshield",
        nullifier,
        amount,
        private: {
            secret: wallet.secret,
            balance: availableCommitment.amount,
            salt: availableCommitment.salt
        },
        meta: {
            commitmentIndex: wallet.commitments.indexOf(availableCommitment)
        }
    };
}

/**
 * تحديث المحفظة بعد معاملة ناجحة
 */
function updateWalletAfterTransaction(wallet, transaction) {
    switch (transaction.type) {
        case "deposit":
            // إضافة commitment جديد
            wallet.commitments.push({
                commitment: transaction.commitment,
                amount: transaction.amount,
                salt: transaction.private.salt,
                used: false,
                timestamp: Date.now()
            });
            wallet.balance += transaction.amount;
            break;

        case "private_transfer":
            // تحديد الـ commitment القديم كمستخدم
            const oldIndex = transaction.meta.commitmentIndex;
            if (oldIndex !== -1) {
                wallet.commitments[oldIndex].used = true;
            }

            // إضافة commitment جديد للرصيد المتبقي (إن وُجد)
            if (transaction.meta.newSenderAmount > 0) {
                wallet.commitments.push({
                    commitment: transaction.senderNewCommitment,
                    amount: transaction.meta.newSenderAmount,
                    salt: transaction.meta.newSenderSalt,
                    used: false,
                    timestamp: Date.now()
                });
            }

            // تحديث الرصيد
            wallet.balance -= transaction.private.amount;
            wallet.salt = transaction.meta.newSenderSalt;
            break;

        case "shield":
            // مشابه لـ deposit
            wallet.commitments.push({
                commitment: transaction.commitment,
                amount: transaction.amount,
                salt: transaction.private.salt,
                used: false,
                timestamp: Date.now()
            });
            wallet.balance += transaction.amount;
            break;

        case "unshield":
            // تحديد الـ commitment كمستخدم
            const unshieldIndex = transaction.meta.commitmentIndex;
            if (unshieldIndex !== -1) {
                wallet.commitments[unshieldIndex].used = true;
            }
            wallet.balance -= transaction.amount;
            break;
    }

    return wallet;
}

/**
 * حساب الرصيد المتاح
 */
function getAvailableBalance(wallet) {
    return wallet.commitments
        .filter(c => !c.used)
        .reduce((sum, c) => sum + c.amount, 0);
}

/**
 * عرض معلومات المعاملة
 */
function displayTransactionInfo(transaction) {
    console.log("\n📄 معلومات المعاملة:");
    console.log("   النوع:", transaction.type);

    switch (transaction.type) {
        case "deposit":
            console.log("   Commitment:", transaction.commitment);
            console.log("   المبلغ:", transaction.amount);
            break;

        case "private_transfer":
            console.log("   Old Commitment:", transaction.oldCommitment.substring(0, 20) + "...");
            console.log("   Nullifier:", transaction.nullifier.substring(0, 20) + "...");
            console.log("   Sender New Commitment:", transaction.senderNewCommitment.substring(0, 20) + "...");
            console.log("   Recipient Commitment:", transaction.recipientCommitment.substring(0, 20) + "...");
            console.log("   المبلغ المُحوَّل:", transaction.private.amount);
            console.log("   الرصيد المتبقي:", transaction.meta.newSenderAmount);
            break;

        case "shield":
            console.log("   Commitment:", transaction.commitment);
            console.log("   المبلغ:", transaction.amount);
            break;

        case "unshield":
            console.log("   Nullifier:", transaction.nullifier.substring(0, 20) + "...");
            console.log("   المبلغ:", transaction.amount);
            break;
    }
}

module.exports = {
    pedersenHash,
    calculateCommitment,
    calculateNullifier,
    buildDepositTransaction,
    buildPrivateTransfer,
    buildShieldTransaction,
    buildUnshieldTransaction,
    updateWalletAfterTransaction,
    getAvailableBalance,
    displayTransactionInfo
};
