# 📦 دليل التثبيت الشامل - Moonify

هذا الدليل يشرح خطوة بخطوة كيفية تثبيت وإعداد Moonify على مختلف الأنظمة.

---

## 📑 جدول المحتويات

- [Windows (WSL)](#windows-wsl)
- [Linux (Ubuntu/Debian)](#linux-ubuntudebian)
- [macOS](#macos)
- [التحقق من التثبيت](#التحقق-من-التثبيت)
- [إعداد المشروع](#إعداد-المشروع)
- [حل المشاكل الشائعة](#حل-المشاكل-الشائعة)

---

## Windows (WSL)

### الخطوة 1: تثبيت WSL

افتح PowerShell كمسؤول (Administrator) واكتب:

```powershell
wsl --install
```

ستحتاج لإعادة تشغيل الكمبيوتر بعدها.

### الخطوة 2: فتح WSL

بعد إعادة التشغيل، افتح WSL من قائمة Start:
- ابحث عن "Ubuntu" أو "WSL"
- افتح Terminal

### الخطوة 3: تحديث النظام

```bash
sudo apt update && sudo apt upgrade -y
```

### الخطوة 4: تثبيت Node.js

```bash
# تحميل سكربت التثبيت
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# تثبيت Node.js
sudo apt-get install -y nodejs

# التحقق
node --version  # يجب أن يظهر v18.x أو أحدث
npm --version
```

### الخطوة 5: تثبيت Git

```bash
sudo apt-get install -y git
git --version
```

### الخطوة 6: تثبيت Rust

```bash
# تحميل وتثبيت Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# اتبع التعليمات (اضغط Enter للقبول)
# ثم قم بتحديث PATH
source $HOME/.cargo/env

# التحقق
rustc --version
cargo --version
```

### الخطوة 7: تثبيت Noir

```bash
# تحميل noirup
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash

# تحديث PATH (قد تحتاج لإعادة فتح Terminal)
source ~/.bashrc

# تثبيت Noir
noirup

# التحقق
nargo --version
```

### الخطوة 8: استنساخ المشروع

```bash
# الانتقال للمجلد الرئيسي
cd ~

# استنساخ المشروع (أو نسخه من Windows)
# إذا كان المشروع في OneDrive/Documents
cd /mnt/c/Users/YOURNAME/OneDrive/Documents/0/moonify

# أو استنسخه من Git
git clone https://github.com/yourusername/moonify.git
cd moonify
```

---

## Linux (Ubuntu/Debian)

### الخطوة 1: تحديث النظام

```bash
sudo apt update && sudo apt upgrade -y
```

### الخطوة 2: تثبيت الأدوات الأساسية

```bash
sudo apt install -y curl git build-essential
```

### الخطوة 3: تثبيت Node.js

```bash
# إضافة مستودع NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# تثبيت Node.js
sudo apt-get install -y nodejs

# التحقق
node --version
npm --version
```

### الخطوة 4: تثبيت Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# التحقق
rustc --version
cargo --version
```

### الخطوة 5: تثبيت Noir

```bash
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
source ~/.bashrc
noirup

# التحقق
nargo --version
```

### الخطوة 6: استنساخ المشروع

```bash
git clone https://github.com/yourusername/moonify.git
cd moonify
```

---

## macOS

### الخطوة 1: تثبيت Homebrew

إذا لم يكن مثبتاً:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### الخطوة 2: تثبيت Node.js

```bash
brew install node

# التحقق
node --version
npm --version
```

### الخطوة 3: تثبيت Git

```bash
brew install git
git --version
```

### الخطوة 4: تثبيت Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

rustc --version
cargo --version
```

### الخطوة 5: تثبيت Noir

```bash
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
source ~/.zshrc  # أو ~/.bashrc حسب shell
noirup

nargo --version
```

### الخطوة 6: استنساخ المشروع

```bash
git clone https://github.com/yourusername/moonify.git
cd moonify
```

---

## التحقق من التثبيت

تحقق من جميع الأدوات:

```bash
# Node.js
node --version      # يجب: v18.0.0 أو أحدث
npm --version       # يجب: 8.0.0 أو أحدث

# Git
git --version       # أي إصدار

# Rust
rustc --version     # أي إصدار حديث
cargo --version     # أي إصدار حديث

# Noir
nargo --version     # 0.31.0 أو أحدث
```

إذا ظهرت جميع الإصدارات، أنت جاهز! ✅

---

## إعداد المشروع

### 1. تثبيت Dependencies

```bash
cd moonify
npm install
```

**ملاحظة**: قد تظهر بعض warnings - هذا عادي، المهم عدم وجود errors.

### 2. إعداد ملف البيئة

```bash
# نسخ ملف المثال
cp .env.example .env

# تعديل الملف
nano .env  # أو أي محرر نصوص
```

أضف المعلومات التالية:

```bash
# مفتاح خاص من MetaMask (للاختبار فقط!)
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# RPC URL من Infura أو Alchemy
SEPOLIA_RPC=https://sepolia.infura.io/v3/YOUR_PROJECT_ID

# Etherscan API (للتحقق من العقود)
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_KEY
```

**كيفية الحصول عليها:**

- **PRIVATE_KEY**: من MetaMask > الإعدادات > الأمان > Show Private Key
  - ⚠️ استخدم محفظة اختبار فقط!
  
- **SEPOLIA_RPC**:
  - اذهب إلى [Infura.io](https://infura.io)
  - أنشئ حساب مجاني
  - أنشئ مشروع جديد
  - انسخ Sepolia RPC URL
  
- **ETHERSCAN_API_KEY**:
  - اذهب إلى [Etherscan.io](https://etherscan.io)
  - أنشئ حساب
  - اذهب لـ API Keys
  - أنشئ مفتاح جديد

### 3. بناء الدائرة (Circuit)

```bash
cd circuits
nargo compile
cd ..
```

يجب أن ترى:
```
[circuits] Constraint system successfully built!
```

### 4. تجميع العقود

```bash
npx hardhat compile
```

يجب أن ترى:
```
Compiled 3 Solidity files successfully
```

### 5. الاختبار المحلي

```bash
# في terminal 1
npx hardhat node

# في terminal 2
npx hardhat run scripts/deploy.js --network localhost
```

إذا رأيت العقود منشورة، كل شيء يعمل! ✅

---

## حل المشاكل الشائعة

### ❌ `command not found: node`

**الحل:**
```bash
# أعد تحميل PATH
source ~/.bashrc  # أو ~/.zshrc للـ macOS

# أو أعد فتح Terminal
```

### ❌ `command not found: nargo`

**الحل:**
```bash
# أعد تثبيت Noir
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
source ~/.bashrc
noirup
```

### ❌ `EACCES` permissions error عند npm install

**الحل:**
```bash
# لا تستخدم sudo!
# أعد تكوين npm
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# ثم حاول مرة أخرى
npm install
```

### ❌ `Error: could not detect network`

**الحل:**
- تأكد من صحة SEPOLIA_RPC في ملف `.env`
- تأكد من اتصالك بالإنترنت
- جرب RPC مختلف (Alchemy بدلاً من Infura)

### ❌ `nargo: permission denied`

**الحل:**
```bash
chmod +x ~/.nargo/bin/nargo
```

### ❌ WSL: `cannot access Windows files`

**الحل:**
```bash
# الوصول لملفات Windows عبر
cd /mnt/c/Users/YOUR_USERNAME/...

# أو انسخ المشروع داخل WSL
cp -r /mnt/c/Users/.../moonify ~/moonify
cd ~/moonify
```

---

## ✅ تأكد من الجاهزية

قم بتشغيل هذا السكربت:

```bash
# اختبار البراهين
npm run prove
```

إذا رأيت "✅ نجحت المحاكاة!" - أنت جاهز تماماً! 🎉

---

## 📞 هل تحتاج للمساعدة؟

إذا واجهت مشاكل:

1. راجع هذا الدليل مرة أخرى
2. تحقق من [README.md](./README.md)
3. ابحث في Issues على GitHub
4. افتح Issue جديد مع تفاصيل الخطأ

---

## التالي: البدء في الاست خدام

الآن أنت جاهز! اذهب إلى [README.md](./README.md) واتبع قسم "الاستخدام السريع".

بالتوفيق! 🌙
