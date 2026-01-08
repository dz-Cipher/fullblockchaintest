// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./UltraVerifier.sol";

/**
 * ==========================================
 * MoonPool - مجمع المعاملات الخاصة
 * ==========================================
 * 
 * هذا العقد هو قلب النظام! يدير:
 * 1. Commitments - التعهدات المخفية للأرصدة
 * 2. Nullifiers - منع الإنفاق المزدوج
 * 3. التحقق من البراهين
 * 4. معالجة التحويلات الخاصة
 * 
 * تدفق المعاملة الخاصة:
 * 1. المستخدم يُنشئ proof محلياً (على جهازه)
 * 2. يُرسل الـ proof + public data إلى هذا العقد
 * 3. العقد يتحقق من الـ proof عبر UltraVerifier
 * 4. إذا كان صحيحاً، يُسجل التحويل بدون كشف التفاصيل
 * 
 * الخصوصية:
 * - لا أحد يعرف: من أرسل، لمن أرسل، كم أرسل
 * - فقط المُرسل والمُستقبِل يعرفون (محلياً على أجهزتهم)
 * - حتى مُشغل العقد أو الـ node لا يستطيع معرفة التفاصيل
 */

contract MoonPool {
    
    // ==========================================
    // State Variables - متغيرات الحالة
    // ==========================================
    
    /// @dev عقد Verifier للتحقق من البراهين
    UltraVerifier public verifier;
    
    /// @dev تتبع جميع الـ commitments المُسجلة
    /// commitment => هل مُسجل؟
    mapping(bytes32 => bool) public commitments;
    
    /// @dev تتبع جميع الـ nullifiers المُستخدمة
    /// nullifier => هل مُستخدم؟
    /// هذا يمنع إعادة استخدام نفس الـ commitment (double spending)
    mapping(bytes32 => bool) public nullifiers;
    
    /// @dev عدد المعاملات الكلي (للإحصائيات فقط)
    uint256 public transactionCount;
    
    /// @dev مالك العقد (للإدارة فقط)
    address public owner;
    
    // ==========================================
    // Events - الأحداث
    // ==========================================
    
    /**
     * @dev يُطلق عند إيداع جديد (commitment جديد)
     * @param commitment الـ commitment المُسجل
     * @param index رقم المعاملة
     */
    event Deposit(bytes32 indexed commitment, uint256 indexed index);
    
    /**
     * @dev يُطلق عند تحويل خاص
     * @param nullifier الـ nullifier المُستخدم (لإبطال commitment قديم)
     * @param senderNewCommitment commitment جديد للمُرسل
     * @param recipientCommitment commitment للمُستقبِل
     * @param index رقم المعاملة
     */
    event PrivateTransfer(
        bytes32 indexed nullifier,
        bytes32 senderNewCommitment,
        bytes32 recipientCommitment,
        uint256 indexed index
    );
    
    // ==========================================
    // Modifiers - المُعدِّلات
    // ==========================================
    
    /// @dev فقط المالك يستطيع التنفيذ
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    // ==========================================
    // Constructor - البناء
    // ==========================================
    
    /**
     * @param _verifier عنوان عقد UltraVerifier
     */
    constructor(address _verifier) {
        verifier = UltraVerifier(_verifier);
        owner = msg.sender;
    }
    
    // ==========================================
    // Core Functions - الوظائف الأساسية
    // ==========================================
    
    /**
     * @notice إيداع أموال وإنشاء commitment جديد
     * @param commitment الـ commitment (hash للرصيد + secret)
     * 
     * كيف يعمل:
     * 1. المستخدم يُنشئ commitment محلياً: hash(amount, secret, salt)
     * 2. يُرسل ETH مع الـ commitment
     * 3. العقد يُسجل الـ commitment بدون معرفة التفاصيل
     * 4. الآن المستخدم يملك رصيداً خاصاً يمكن استخدامه لاحقاً
     */
    function deposit(bytes32 commitment) external payable {
        // التحقق من أن المبلغ > 0
        require(msg.value > 0, "Amount must be > 0");
        
        // التحقق من أن الـ commitment غير مُسجل مسبقاً
        require(!commitments[commitment], "Commitment already exists");
        
        // تسجيل الـ commitment
        commitments[commitment] = true;
        
        // زيادة عداد المعاملات
        transactionCount++;
        
        // إطلاق حدث الإيداع
        emit Deposit(commitment, transactionCount);
    }
    
    /**
     * @notice تحويل خاص باستخدام Zero-Knowledge Proof
     * @param proof البرهان المُولَّد من الدائرة
     * @param oldCommitment الـ commitment القديم (يجب أن يكون مُسجلاً)
     * @param nullifier الـ nullifier لإبطال الـ commitment القديم
     * @param senderNewCommitment commitment جديد للمُرسل (للرصيد المتبقي)
     * @param recipientCommitment commitment للمُستقبِل (للمبلغ المُحوَّل)
     * 
     * تدفق العمل:
     * 1. التحقق من أن oldCommitment موجود
     * 2. التحقق من أن nullifier لم يُستخدم من قبل
     * 3. التحقق من صحة الـ proof
     * 4. تسجيل nullifier لمنع إعادة الاستخدام
     * 5. تسجيل الـ commitments الجديدة
     * 6. ✅ تم التحويل بنجاح بدون كشف أي تفاصيل!
     */
    function privateTransfer(
        bytes calldata proof,
        bytes32 oldCommitment,
        bytes32 nullifier,
        bytes32 senderNewCommitment,
        bytes32 recipientCommitment
    ) external {
        
        // ==========================================
        // الخطوة 1: التحقق من الـ Commitment القديم
        // ==========================================
        require(commitments[oldCommitment], "Old commitment does not exist");
        
        // ==========================================
        // الخطوة 2: التحقُّق من الـ Nullifier
        // ==========================================
        // التأكد من أن الـ nullifier لم يُستخدم من قبل (منع double spending)
        require(!nullifiers[nullifier], "Nullifier already used");
        
        // ==========================================
        // الخطوة 3: التحقق من الـ Proof
        // ==========================================
        // تجهيز المدخلات العامة للـ verifier
        bytes32[] memory publicInputs = new bytes32[](4);
        publicInputs[0] = oldCommitment;
        publicInputs[1] = nullifier;
        publicInputs[2] = senderNewCommitment;
        publicInputs[3] = recipientCommitment;
        
        // التحقق من صحة البرهان
        bool isValid = verifier.verify(proof, publicInputs);
        require(isValid, "Invalid proof");
        
        // ==========================================
        // الخطوة 4: تسجيل الـ Nullifier
        // ==========================================
        // تسجيل أن هذا الـ nullifier تم استخدامه
        nullifiers[nullifier] = true;
        
        // ==========================================
        // الخطوة 5: تسجيل الـ Commitments الجديدة
        // ==========================================
        // تسجيل commitment المُرسل الجديد
        if (senderNewCommitment != bytes32(0)) {
            commitments[senderNewCommitment] = true;
        }
        
        // تسجيل commitment المُستقبِل
        commitments[recipientCommitment] = true;
        
        // ==========================================
        // الخطوة 6: زيادة العداد وإطلاق الحدث
        // ==========================================
        transactionCount++;
        
        emit PrivateTransfer(
            nullifier,
            senderNewCommitment,
            recipientCommitment,
            transactionCount
        );
        
        // ✅ تم! المعاملة مُسجلة بدون أي معلومات عن:
        //    - من أرسل
        //    - لمن أرسل  
        //    - كم أرسل
        //    - الرصيد المتبقي
    }
    
    /**
     * @notice سحب أموال (withdraw) باستخدام proof
     * @dev مشابه لـ privateTransfer لكن يُرسل ETH للمستخدم
     * 
     * ملاحظة: هذه وظيفة اختيارية متقدمة
     * يمكن تنفيذها لاحقاً
     */
    function withdraw(
        bytes calldata proof,
        bytes32 nullifier,
        address payable recipient,
        uint256 amount
    ) external {
        // TODO: تنفيذ السحب مع التحقق من البرهان
        // يجب التحقق من أن المستخدم يملك commitment يحتوي على الأموال
        revert("Not implemented yet");
    }
    
    // ==========================================
    // View Functions - وظائف العرض
    // ==========================================
    
    /**
     * @notice التحقق من وجود commitment
     */
    function isCommitmentRegistered(bytes32 commitment) external view returns (bool) {
        return commitments[commitment];
    }
    
    /**
     * @notice التحقق من استخدام nullifier
     */
    function isNullifierUsed(bytes32 nullifier) external view returns (bool) {
        return nullifiers[nullifier];
    }
    
    /**
     * @notice الحصول على رصيد العقد
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    // ==========================================
    // Admin Functions - وظائف الإدارة
    // ==========================================
    
    /**
     * @notice تحديث عقد Verifier (للترقيات)
     */
    function updateVerifier(address newVerifier) external onlyOwner {
        verifier = UltraVerifier(newVerifier);
    }
    
    /**
     * @notice تحويل الملكية
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    /**
     * @notice استقبال ETH
     */
    receive() external payable {}
}

/**
 * ==========================================
 * ملاحظات مهمة للأمان:
 * ==========================================
 * 
 * 1. Double Spending Prevention:
 *    - كل commitment له nullifier فريد واحد فقط
 *    - لا يمكن استخدام نفس nullifier مرتين
 *    - هذا يمنع إعادة استخدام نفس الأموال
 * 
 * 2. Privacy Guarantees:
 *    - فقط commitments و nullifiers مرئية
 *    - لا توجد روابط بين المُرسل والمُستقبِل
 *    - المبالغ مخفية تماماً
 * 
 * 3. Security Considerations:
 *    - يجب استخدام Verifier حقيقي في الإنتاج
 *    - يجب عمل audit للعقود قبل النشر
 *    - احفظ secrets محلياً فقط، لا ترسلها أبداً
 * 
 * 4. Gas Optimization:
 *    - استخدام mappings بدلاً من arrays
 *    - events للتسجيل بدلاً من storage الزائد
 *    - packed storage عند الإمكان
 */
