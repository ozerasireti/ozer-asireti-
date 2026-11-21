// divan-yorum.js — Özer Aşireti Üyelikli ve Canlı Veritabanlı Yorum Sistemi
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
    signOut, onAuthStateChanged, updateProfile 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
    getFirestore, collection, addDoc, query, where, orderBy, 
    onSnapshot, serverTimestamp, deleteDoc, doc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase Bağlantı Ayarları (ozer-asireti-divan)
const firebaseConfig = {
    apiKey: "AIzaSyBg5Vam8LH4RCU4a1snvMHbg8COizlwo1c",
    authDomain: "ozer-asireti-divan.firebaseapp.com",
    projectId: "ozer-asireti-divan",
    storageBucket: "ozer-asireti-divan.firebasestorage.app",
    messagingSenderId: "834924082384",
    appId: "1:834924082384:web:e7e28f0d2df7ce03215ad5",
    measurementId: "G-MDYYG6GPSV"
};

// Yönetici E-posta Adresi (Siteye bu mail ile giriş yaptığında yorum silme yetkisi açılır)
const YONETICI_EPOSTA = "said.ozer@ornek.com";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Sayfadaki TÜM haber yorum kutularını bul
const tumKutular = document.querySelectorAll(".divan-yorum-kutusu");

tumKutular.forEach((kutu) => {
    const haberId = kutu.dataset.haberId || "genel";

    kutu.innerHTML = `
        <div style="border-top: 2px solid #000000; margin-top: 30px; padding-top: 20px; font-family: Arial, sans-serif;">
            <h4 style="color: #b30000; font-size: 16px; margin-bottom: 12px; letter-spacing: 0.5px;">BU HABERE YORUM YAPIN</h4>
            
            <!-- Giriş Yapmamış Kullanıcılar İçin Üyelik Kutusu -->
            <div class="uyelik-paneli" style="background: #f9f9f9; border: 1px solid #cccccc; padding: 15px; margin-bottom: 18px;">
                <p style="font-size: 13px; color: #000000; margin-bottom: 10px; text-indent: 0;">
                    <strong>Yorum yazabilmek için üye girişi yapmanız gerekmektedir.</strong>
                </p>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;">
                    <input type="text" class="inp-ad" placeholder="Adınız Soyadınız (Yeni üyelik için)" style="padding: 8px; border: 1px solid #999999; flex: 1; min-width: 150px;">
                    <input type="email" class="inp-eposta" placeholder="E-posta Adresiniz" style="padding: 8px; border: 1px solid #999999; flex: 1; min-width: 150px;">
                    <input type="password" class="inp-sifre" placeholder="Şifreniz (En az 6 hane)" style="padding: 8px; border: 1px solid #999999; flex: 1; min-width: 140px;">
                </div>
                <div style="display: flex; gap: 8px;">
                    <button type="button" class="btn-giris" style="background: #000000; color: #ffffff; border: none; padding: 8px 16px; cursor: pointer; font-weight: bold; font-size: 13px;">Giriş Yap</button>
                    <button type="button" class="btn-kayit" style="background: #b30000; color: #ffffff; border: none; padding: 8px 16px; cursor: pointer; font-weight: bold; font-size: 13px;">Üye Ol</button>
                </div>
                <p class="auth-hata" style="color: #b30000; font-size: 12px; margin-top: 8px; text-indent: 0;"></p>
            </div>

            <!-- Giriş Yapmış Kullanıcılar İçin Yorum Yazma Alanı -->
            <div class="yorum-yazma-paneli" style="display: none; background: #ffffff; border: 1px solid #000000; padding: 15px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span class="kullanici-adi-etiket" style="font-size: 13px; font-weight: bold; color: #000000;"></span>
                    <button type="button" class="btn-cikis" style="background: #555555; color: #ffffff; border: none; padding: 5px 10px; cursor: pointer; font-size: 11px;">Çıkış Yap</button>
                </div>
                <textarea class="txt-yorum" rows="3" placeholder="Bu haber hakkındaki görüşünüzü saygı çerçevesinde yazınız..." style="width: 100%; padding: 9px; border: 1px solid #999999; font-family: inherit; font-size: 14px; margin-bottom: 8px;"></textarea>
                <button type="button" class="btn-gonder" style="background: #b30000; color: #ffffff; border: none; padding: 8px 18px; cursor: pointer; font-weight: bold; font-size: 13px;">Yorumu Gönder</button>
            </div>

            <!-- Sadece Bu Habere Ait Yorumların Listesi -->
            <div class="yorum-akisi"></div>
        </div>
    `;

    // Yeni Üyelik Kaydı
    kutu.querySelector(".btn-kayit").addEventListener("click", async () => {
        const ad = kutu.querySelector(".inp-ad").value.trim();
        const eposta = kutu.querySelector(".inp-eposta").value.trim();
        const sifre = kutu.querySelector(".inp-sifre").value;
        const hata = kutu.querySelector(".auth-hata");

        if (!ad || !eposta || sifre.length < 6) {
            hata.textContent = "Lütfen adınızı, e-postanızı ve en az 6 haneli şifrenizi giriniz.";
            return;
        }
        try {
            const cred = await createUserWithEmailAndPassword(auth, eposta, sifre);
            await updateProfile(cred.user, { displayName: ad });
            hata.textContent = "";
        } catch (err) {
            hata.textContent = "Kayıt hatası: " + err.message;
        }
    });

    // Üye Girişi
    kutu.querySelector(".btn-giris").addEventListener("click", async () => {
        const eposta = kutu.querySelector(".inp-eposta").value.trim();
        const sifre = kutu.querySelector(".inp-sifre").value;
        const hata = kutu.querySelector(".auth-hata");

        try {
            await signInWithEmailAndPassword(auth, eposta, sifre);
            hata.textContent = "";
        } catch (err) {
            hata.textContent = "E-posta veya şifre hatalı.";
        }
    });

    // Çıkış Yapma
    kutu.querySelector(".btn-cikis").addEventListener("click", () => signOut(auth));

    // Veritabanına Yorum Gönderme
    kutu.querySelector(".btn-gonder").addEventListener("click", async () => {
        const txt = kutu.querySelector(".txt-yorum");
        const metin = txt.value.trim();
        const user = auth.currentUser;
        if (!metin || !user) return;

        await addDoc(collection(db, "yorumlar"), {
            haberId: haberId,
            yazarAd: user.displayName || "Üye",
            yazarEposta: user.email,
            yazarId: user.uid,
            yorum: metin,
            tarih: serverTimestamp()
        });

        txt.value = "";
    });
});

// Oturum Açıldığında/Kapandığında Tüm Kutuları Güncelle
onAuthStateChanged(auth, (user) => {
    tumKutular.forEach((kutu) => {
        const haberId = kutu.dataset.haberId || "genel";
        const uyelikPaneli = kutu.querySelector(".uyelik-paneli");
        const yazmaPaneli = kutu.querySelector(".yorum-yazma-paneli");

        if (user) {
            uyelikPaneli.style.display = "none";
            yazmaPaneli.style.display = "block";
            kutu.querySelector(".kullanici-adi-etiket").textContent = "Üye: " + (user.displayName || user.email);
        } else {
            uyelikPaneli.style.display = "block";
            yazmaPaneli.style.display = "none";
        }

        habereOzelYorumlariGetir(kutu, haberId, user);
    });
});

// Her Haberin Sadece Kendi Yorumlarını Veritabanından Canlı Çekme
function habereOzelYorumlariGetir(kutu, haberId, aktifKullanici) {
    const akis = kutu.querySelector(".yorum-akisi");
    const q = query(
        collection(db, "yorumlar"),
        where("haberId", "==", haberId),
        orderBy("tarih", "desc")
    );

    onSnapshot(q, (snapshot) => {
        akis.innerHTML = "";
        if (snapshot.empty) {
            akis.innerHTML = "<p style='color:#666666; font-size:13px; text-indent:0;'>Bu habere henüz yorum yapılmamış. İlk yorumu siz yazabilirsiniz.</p>";
            return;
        }

        snapshot.forEach((belge) => {
            const veri = belge.data();
            const tarihStr = veri.tarih ? veri.tarih.toDate().toLocaleString("tr-TR") : "Az önce";
            const yoneticiMi = aktifKullanici && aktifKullanici.email === YONETICI_EPOSTA;

            const kart = document.createElement("div");
            kart.style.cssText = "border-bottom: 1px solid #e0e0e0; padding: 12px 0;";
            kart.innerHTML = `
                <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:5px;">
                    <strong style="color:#000000;">${veri.yazarAd}</strong>
                    <span style="color:#666666;">${tarihStr}</span>
                </div>
                <p style="color:#000000; font-size:14px; margin:0; text-align:left; text-indent:0;">${veri.yorum}</p>
            `;

            if (yoneticiMi) {
                const silBtn = document.createElement("button");
                silBtn.type = "button";
                silBtn.textContent = "Yorumu Sil (Yönetici)";
                silBtn.style.cssText = "margin-top:6px; background:#b30000; color:#ffffff; border:none; padding:4px 9px; font-size:11px; cursor:pointer;";
                silBtn.onclick = () => deleteDoc(doc(db, "yorumlar", belge.id));
                kart.appendChild(silBtn);
            }

            akis.appendChild(kart);
        });
    }, (hata) => {
        // İlk sorguda Firestore indeks uyarısı verirse tarayıcı konsolunda tek tıkla oluşturma linki çıkar
        console.warn("Firestore sorgu uyarısı:", hata.message);
    });
}
