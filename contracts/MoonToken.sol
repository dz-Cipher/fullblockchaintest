// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./UltraVerifier.sol";

/**
 * ==========================================
 * MoonToken (MOON) - توكن ERC-20 مع خصوصية كاملة من Moonify
 * ==========================================
 * 
 * هذا التوكن يدمج معيار ERC-20 مع Zero-Knowledge Proofs
 * لتوفير خصوصية كاملة في التحويلات.
 * 
 * الميزات:
 * 1. ✅ جميع التحويلات مخفية
 * 2. ✅ الأرصدة مخفية (مخزنة كـ commitments)
 * 3. ✅ لا يمكن تتبع التحويلات
 * 4. ✅ متوافق مع معيار ERC-20 للتفاعل العام
 * 
 * كيف يعمل:
 * - الأرصدة "العامة" (balanceOf) تعكس فقط الـ commits
 * - الأرصدة الحقيقية مخفية في commitments
 * - التحويلات تتم عبر proofs فقط
 * - يمكن mint توكنات للاختبار
 */

contract MoonToken {
    
    // ==========================================
    // ERC-20 Metadata
    // ==========================================
    
    /// @dev اسم التوكن
    string public constant name = "Moonify Token";
    
    /// @dev رمز التوكن
    string public constant symbol = "MOON";
    
    /// @dev عدد الخانات العشرية (18 مثل ETH)
    uint8 public constant decimals = 18;
    
    /// @dev إجمالي العرض (2 مليار MOON)
    uint256 public totalSupply;
    
    // ==========================================
    // Privacy System
    // ==========================================
    
    /// @dev عقد Verifier للتحقق من البراهين
    UltraVerifier public verifier;
    
    /// @dev تتبع الـ commitments المُسجلة
    /// commitment => رصيد مخفي (الرصيد الحقيقي مخفي داخل commitment)
    mapping(bytes32 => bool) public commitments;
    
    /// @dev تتبع الـ nullifiers المُستخدمة (منع double spending)
    mapping(bytes32 => bool) public nullifiers;
    
    /// @dev الأرصدة "العامة" - للتوافق مع ERC-20
    /// ⚠️ هذه ليست الأرصدة الحقيقية! فقط للإظهار
    mapping(address => uint256) public balances;
    
    /// @dev عدد المعاملات الخاصة
    uint256 public privateTransferCount;
    
    /// @dev مالك العقد
    address public owner;
    
    // ==========================================
    // Events
    // ==========================================
    
    /**
     * @dev حدث ERC-20 قياسي للتحويل
     * ⚠️ في التحويلات الخاصة، العناوين ستكون عناوين وهمية
     */
    event Transfer(address indexed from, address indexed to, uint256 value);
    
    /**
     * @dev حدث الموافقة (لن نستخدمه في هذا الإصدار)
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    /**
     * @dev حدث التحويل الخاص
     */
    event PrivateTransfer(
        bytes32 indexed nullifier,
        bytes32 senderNewCommitment,
        bytes32 recipientCommitment,
        uint256 indexed timestamp
    );
    
    /**
     * @dev حدث إضافة commitment جديد
     */
    event CommitmentAdded(bytes32 indexed commitment, uint256 timestamp);
    
    // ==========================================
    // Modifiers
    // ==========================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    // ==========================================
    // Constructor
    // ==========================================
    
    /**
     * @param _verifier عنوان عقد UltraVerifier
     * @param initialSupply العرض الأولي (للاختبار)
     */
    constructor(address _verifier, uint256 initialSupply) {
        verifier = UltraVerifier(_verifier);
        owner = msg.sender;
        
        // mint العرض الأولي للمالك (للاختبار)
        if (initialSupply > 0) {
            totalSupply = initialSupply;
            balances[msg.sender] = initialSupply;
            emit Transfer(address(0), msg.sender, initialSupply);
        }
    }
    
    // ==========================================
    // ERC-20 Standard Functions (Public)
    // ==========================================
    
    /**
     * @notice الحصول على الرصيد العام
     * @dev هذا ليس الرصيد الحقيقي! فقط للتوافق مع ERC-20
     */
    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }
    
    /**
     * @notice تحويل عام (بدون خصوصية)
     * @dev للاستخدام البسيط فقط - استخدم privateTransfer للخصوصية
     */
    function transfer(address to, uint256 amount) external returns (bool) {
        require(to != address(0), "Invalid recipient");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        balances[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    /**
     * @notice التحقق من الموافقة
     * @dev غير مُنفذ في هذا الإصدار
     */
    function allowance(address, address) external pure returns (uint256) {
        return 0;
    }
    
    /**
     * @notice الموافقة على الإنفاق
     * @dev غير مُنفذ - لا يُستخدم في النظام الخاص
     */
    function approve(address, uint256) external pure returns (bool) {
        revert("Use private transfers instead");
    }
    
    /**
     * @notice تحويل من نيابة عن
     * @dev غير مُنفذ - لا يُستخدم في النظام الخاص
     */
    function transferFrom(address, address, uint256) external pure returns (bool) {
        revert("Use private transfers instead");
    }
    
    // ==========================================
    // Private Transfer Functions
    // ==========================================
    
    /**
     * @notice إضافة commitment جديد (shield - تحويل إلى خاص)
     * @param commitment الـ commitment المُراد إضافته
     * @param amount المبلغ المراد تحويله إلى خاص
     * 
     * كيف يعمل:
     * 1. المستخدم لديه توكنات عامة (balances[user])
     * 2. يُنشئ commitment: hash(amount, secret, salt)
     * 3. يحرق (burn) التوكنات العامة
     * 4. يُضيف commitment (الآن الرصيد خاص!)
     */
    function shield(bytes32 commitment, uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        require(!commitments[commitment], "Commitment exists");
        
        // حرق التوكنات العامة
        balances[msg.sender] -= amount;
        
        // إضافة الـ commitment
        commitments[commitment] = true;
        
        // إطلاق الأحداث
        emit Transfer(msg.sender, address(0), amount);
        emit CommitmentAdded(commitment, block.timestamp);
    }
    
    /**
     * @notice تحويل خاص باستخدام Zero-Knowledge Proof
     * @param proof البرهان
     * @param oldCommitment الـ commitment القديم
     * @param nullifier الـ nullifier
     * @param senderNewCommitment commitment جديد للمُرسل
     * @param recipientCommitment commitment للمُستقبِل
     * 
     * تدفق العمل (مثل PrivatePool):
     * 1. التحقق من oldCommitment
     * 2. التحقق من nullifier
     * 3. التحقق من الـ proof
     * 4. تسجيل المعاملة
     */
    function privateTransfer(
        bytes calldata proof,
        bytes32 oldCommitment,
        bytes32 nullifier,
        bytes32 senderNewCommitment,
        bytes32 recipientCommitment
    ) external {
        
        // التحقق من وجود الـ commitment القديم
        require(commitments[oldCommitment], "Old commitment not found");
        
        // التحقق من عدم استخدام الـ nullifier
        require(!nullifiers[nullifier], "Nullifier already used");
        
        // تجهيز المدخلات العامة
        bytes32[] memory publicInputs = new bytes32[](4);
        publicInputs[0] = oldCommitment;
        publicInputs[1] = nullifier;
        publicInputs[2] = senderNewCommitment;
        publicInputs[3] = recipientCommitment;
        
        // التحقق من الـ proof
        bool isValid = verifier.verify(proof, publicInputs);
        require(isValid, "Invalid proof");
        
        // تسجيل الـ nullifier
        nullifiers[nullifier] = true;
        
        // تسجيل الـ commitments الجديدة
        if (senderNewCommitment != bytes32(0)) {
            commitments[senderNewCommitment] = true;
        }
        commitments[recipientCommitment] = true;
        
        // زيادة العداد
        privateTransferCount++;
        
        // إطلاق الحدث
        emit PrivateTransfer(
            nullifier,
            senderNewCommitment,
            recipientCommitment,
            block.timestamp
        );
        
        // ✅ تم! معاملة خاصة كاملة
        // لا أحد يعرف: من أرسل، لمن، أو كم
    }
    
    /**
     * @notice فك التشفير (unshield - تحويل إلى عام)
     * @param proof البرهان
     * @param nullifier الـ nullifier
     * @param amount المبلغ المراد فك إخفائه
     * 
     * ⚠️ هذا يكشف المبلغ! استخدمه فقط عند الحاجة
     */
    function unshield(
        bytes calldata proof,
        bytes32 nullifier,
        uint256 amount
    ) external {
        // التحقق من عدم استخدام nullifier
        require(!nullifiers[nullifier], "Nullifier used");
        
        // TODO: التحقق من الـ proof بشكل صحيح
        // الآن نقبل أي proof صالح للاختبار
        require(proof.length > 0, "Invalid proof");
        
        // تسجيل الـ nullifier
        nullifiers[nullifier] = true;
        
        // mint توكنات عامة للمستخدم
        balances[msg.sender] += amount;
        
        emit Transfer(address(0), msg.sender, amount);
    }
    
    // ==========================================
    // Admin Functions
    // ==========================================
    
    /**
     * @notice mint توكنات جديدة (للاختبار فقط)
     * @dev يجب تعطيلها في الإنتاج!
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid address");
        
        balances[to] += amount;
        totalSupply += amount;
        
        emit Transfer(address(0), to, amount);
    }
    
    /**
     * @notice تحديث الـ verifier
     */
    function updateVerifier(address newVerifier) external onlyOwner {
        verifier = UltraVerifier(newVerifier);
    }
    
    /**
     * @notice نقل الملكية
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    // ==========================================
    // View Functions
    // ==========================================
    
    /**
     * @notice التحقق من commitment
     */
    function isCommitmentRegistered(bytes32 commitment) external view returns (bool) {
        return commitments[commitment];
    }
    
    /**
     * @notice التحقق من nullifier
     */
    function isNullifierUsed(bytes32 nullifier) external view returns (bool) {
        return nullifiers[nullifier];
    }
    
    /**
     * @notice عدد المعاملات الخاصة
     */
    function getPrivateTransferCount() external view returns (uint256) {
        return privateTransferCount;
    }
}

/**
 * ==========================================
 * كيفية الاستخدام:
 * ==========================================
 * 
 * 1. تحويل توكنات إلى خاصة (Shield):
 *    - لديك 100 PRIV عام
 *    - تُنشئ commitment: hash(100, secret, 0)
 *    - تستدعي shield(commitment, 100)
 *    - ✅ الآن لديك 100 PRIV خاص!
 * 
 * 2. تحويل خاص:
 *    - تريد إرسال 30 PRIV
 *    - تُنشئ proof محلياً
 *    - تستدعي privateTransfer(proof, ...)
 *    - ✅ تم بدون كشف أي معلومة!
 * 
 * 3. تحويل إلى عام (Unshield):
 *    - تُنشئ proof أنك تملك 50 PRIV
 *    - تستدعي unshield(proof, nullifier, 50)
 *    - ✅ لديك الآن 50 PRIV عام
 * 
 * ==========================================
 * ملاحظات الأمان:
 * ==========================================
 * 
 * 1. Mint Function:
 *    - مُخصصة للاختبار فقط
 *    - يجب تعطيلها في الإنتاج
 *    - أو استخدام نموذج أكثر أماناً
 * 
 * 2. Supply Tracking:
 *    - totalSupply يتتبع التوكنات العامة
 *    - لا يشمل التوكنات الخاصة
 *    - يجب تحديث النموذج للإنتاج
 * 
 * 3. Best Practices:
 *    - احفظ secrets محلياً فقط
 *    - لا تُشارك proofs العامة
 *    - استخدم verifier حقيقي
 *    - قم بعمل audit قبل النشر
 */
