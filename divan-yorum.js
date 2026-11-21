// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBg5Vam8LH4RCU4a1snvMHbg8COizlwo1c",
  authDomain: "ozer-asireti-divan.firebaseapp.com",
  projectId: "ozer-asireti-divan",
  storageBucket: "ozer-asireti-divan.firebasestorage.app",
  messagingSenderId: "834924082384",
  appId: "1:834924082384:web:e7e28f0d2df7ce03215ad5",
  measurementId: "G-MDYYG6GPSV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
// divan-yorum.js — Üyelikli ve Veritabanlı Gerçek Yorum Sistemi
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
    signOut, onAuthStateChanged, updateProfile 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
    getFirestore, collection, addDoc, query, where, orderBy, 
    onSnapshot, serverTimestamp, deleteDoc, doc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 1. BURAYA FIREBASE'DEN ALDIĞIN KENDİ BİLGİLERİNİ YAPIŞTIR BEYİM:
const firebaseConfig = {
    apiKey: "BURAYA_API_KEY_GELECEK",
    authDomain: "ozer-asireti-divan.firebaseapp.com",
    projectId: "ozer-asireti-divan",
    storageBucket: "ozer-asireti-divan.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};

// Yönetici E-posta Adresin (Sadece bu hesap yorumları silebilir/denetleyebilir)
const YONETICI_EPOSTA = "said.ozer@ornek.com";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Hangi sayfada olduğumuzu otomatik algılar (index veya kasim-sonrasi)
const sayfaKimligi = document.getElementById("divan-yorum-alani").dataset.sayfa || "genel";

const alan = document.getElementById("divan-yorum-alani");

// Arayüz İskeleti
alan.innerHTML = `
    <div style="border-top: 2px solid #000; margin-top: 40px; padding-top: 25px; font-family: Arial, sans-serif;">
        <h3 style="color: #cc0000; font-size: 20px; margin-bottom: 15px;">DİVAN YORUM VE DEĞERLENDİRME KÖŞESİ</h3>
        
        <!-- Üyelik / Giriş Alanı -->
        <div id="uyelik-kutusu" style="background: #f9f9f9; border: 1px solid #ccc; padding: 18px; margin-bottom: 20px;">
            <p style="font-size: 14px; color: #000; margin-bottom: 12px;">
                <strong>Yorum yazabilmek için üye girişi yapmanız gerekmektedir.</strong>
            </p>
            <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px;">
                <input type="text" id="uye-ad" placeholder="Adınız Soyadınız (Kayıt için)" style="padding: 9px; border: 1px solid #999; flex: 1; min-width: 180px;">
                <input type="email" id="uye-eposta" placeholder="E-posta Adresiniz" style="padding: 9px; border: 1px solid #999; flex: 1; min-width: 180px;">
                <input type="password" id="uye-sifre" placeholder="Şifreniz (En az 6 karakter)" style="padding: 9px; border: 1px solid #999; flex: 1; min-width: 160px;">
            </div>
            <div style="display: flex; gap: 10px;">
                <button id="btn-giris" style="background: #000; color: #fff; border: none; padding: 10px 18px; cursor: pointer; font-weight: bold;">Giriş Yap</button>
                <button id="btn-kayit" style="background: #cc0000; color: #fff; border: none; padding: 10px 18px; cursor: pointer; font-weight: bold;">Yeni Üyelik Oluştur</button>
            </div>
            <p id="auth-mesaj" style="color: #cc0000; font-size: 13px; margin-top: 8px;"></p>
        </div>

        <!-- Giriş Yapılmışsa Görünecek Yorum Yazma Alanı -->
        <div id="yorum-yazma-kutusu" style="display: none; background: #fff; border: 1px solid #000; padding: 18px; margin-bottom: 25px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span id="aktif-kullanici-bilgi" style="font-size: 14px; font-weight: bold; color: #000;"></span>
                <button id="btn-cikis" style="background: #555; color: #fff; border: none; padding: 6px 12px; cursor: pointer; font-size: 12px;">Çıkış Yap</button>
            </div>
            <textarea id="yorum-metni" rows="3" placeholder="Düşüncelerinizi saygı çerçevesinde buraya yazınız..." style="width: 100%; padding: 10px; border: 1px solid #999; font-family: inherit; font-size: 15px; margin-bottom: 10px;"></textarea>
            <button id="btn-yorum-gonder" style="background: #cc0000; color: #fff; border: none; padding: 10px 22px; cursor: pointer; font-weight: bold;">Yorumu Gönder</button>
        </div>

        <!-- Veritabanından Gelen Gerçek Yorumlar Listesi -->
        <div id="yorumlar-listesi"></div>
    </div>
`;

// Kayıt Olma İşlemi
document.getElementById("btn-kayit").addEventListener("click", async () => {
    const ad = document.getElementById("uye-ad").value.trim();
    const eposta = document.getElementById("uye-eposta").value.trim();
    const sifre = document.getElementById("uye-sifre").value;
    const mesaj = document.getElementById("auth-mesaj");

    if (!ad || !eposta || sifre.length < 6) {
        mesaj.textContent = "Lütfen adınızı, e-postanızı ve en az 6 haneli şifrenizi giriniz.";
        return;
    }
    try {
        const userCred = await createUserWithEmailAndPassword(auth, eposta, sifre);
        await updateProfile(userCred.user, { displayName: ad });
        mesaj.textContent = "";
    } catch (err) {
        mesaj.textContent = "Kayıt hatası: " + err.message;
    }
});

// Giriş Yapma İşlemi
document.getElementById("btn-giris").addEventListener("click", async () => {
    const eposta = document.getElementById("uye-eposta").value.trim();
    const sifre = document.getElementById("uye-sifre").value;
    const mesaj = document.getElementById("auth-mesaj");

    try {
        await signInWithEmailAndPassword(auth, eposta, sifre);
        mesaj.textContent = "";
    } catch (err) {
        mesaj.textContent = "Giriş başarısız: E-posta veya şifre hatalı.";
    }
});

// Çıkış Yapma
document.getElementById("btn-cikis").addEventListener("click", () => signOut(auth));

// Oturum Durumunu Dinle
onAuthStateChanged(auth, (user) => {
    const uyelikKutusu = document.getElementById("uyelik-kutusu");
    const yorumKutusu = document.getElementById("yorum-yazma-kutusu");

    if (user) {
        uyelikKutusu.style.display = "none";
        yorumKutusu.style.display = "block";
        document.getElementById("aktif-kullanici-bilgi").textContent = 
            "Üye: " + (user.displayName || user.email);
    } else {
        uyelikKutusu.style.display = "block";
        yorumKutusu.style.display = "none";
    }
    yorumlariGetir(user);
});

// Veritabanına Yorum Kaydetme
document.getElementById("btn-yorum-gonder").addEventListener("click", async () => {
    const metin = document.getElementById("yorum-metni").value.trim();
    const user = auth.currentUser;
    if (!metin || !user) return;

    await addDoc(collection(db, "yorumlar"), {
        sayfa: sayfaKimligi,
        yazarAd: user.displayName || "Üye",
        yazarEposta: user.email,
        yazarId: user.uid,
        yorum: metin,
        tarih: serverTimestamp()
    });

    document.getElementById("yorum-metni").value = "";
});

// Veritabanından Yorumları Canlı Çekme ve Yönetici Silme Yetkisi
function yorumlariGetir(aktifKullanici) {
    const liste = document.getElementById("yorumlar-listesi");
    const q = query(
        collection(db, "yorumlar"),
        where("sayfa", "==", sayfaKimligi),
        orderBy("tarih", "desc")
    );

    onSnapshot(q, (snapshot) => {
        liste.innerHTML = "";
        if (snapshot.empty) {
            liste.innerHTML = "<p style='color:#555; font-size:14px;'>Henüz yorum yapılmamış. İlk yorumu siz yapabilirsiniz.</p>";
            return;
        }

        snapshot.forEach((belge) => {
            const veri = belge.data();
            const tarihStr = veri.tarih ? veri.tarih.toDate().toLocaleString("tr-TR") : "Az önce";
            const yoneticiMi = aktifKullanici && aktifKullanici.email === YONETICI_EPOSTA;

            const kart = document.createElement("div");
            kart.style.cssText = "border-bottom: 1px solid #ddd; padding: 14px 0;";
            kart.innerHTML = `
                <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px;">
                    <strong style="color:#000;">${veri.yazarAd}</strong>
                    <span style="color:#666;">${tarihStr}</span>
                </div>
                <p style="color:#000; font-size:15px; margin:0;">${veri.yorum}</p>
            `;

            // Eğer sen kendi yönetici e-postanla giriş yaptıysan her yorumun altında "Sil" butonu çıkar
            if (yoneticiMi) {
                const silBtn = document.createElement("button");
                silBtn.textContent = "Yorumu Sil (Yönetici)";
                silBtn.style.cssText = "margin-top:8px; background:#cc0000; color:#fff; border:none; padding:4px 10px; font-size:11px; cursor:pointer;";
                silBtn.onclick = () => deleteDoc(doc(db, "yorumlar", belge.id));
                kart.appendChild(silBtn);
            }

            liste.appendChild(kart);
        });
    });
}
