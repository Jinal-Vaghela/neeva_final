// --- EMERGENCY DIAGNOSTIC ---
window.onerror = function(msg, url, lineNo, columnNo, error) {
  console.error('Neeva Script Error:', msg, 'at', url, ':', lineNo);
  return false;
};

import { auth, db, googleProvider } from "./firebase-config.js";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  signInWithPopup,
  sendPasswordResetEmail,
  confirmPasswordReset 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// -- Global function exposure --
window.addToCart = addToCart;
window.changeQty = changeQty;
window.removeFromCart = removeFromCart;
window.handleGoogleLogin = handleGoogleLogin;
window.openProfile = () => window.location.href = 'profile.html';
window.closeCart = closeCart;
window.openCheckout = openCheckout;
window.closeCheckout = closeCheckout;
window.toggleAuth = toggleAuth;
window.deleteAddress = deleteAddress;

// ── Product Data ──────────────────────────────
let products = [
  {
    id: "prod_1",
    name: "Shrijusukho Powder",
    label: "Gas Relief",
    price: "₹750",
    priceNum: 750,
    size: "100gm · Ayurvedic Formula",
    titleWord: "Gas Relief",
    desc: "Shrijusukho Powder is specialized for quick gas relief and digestive comfort. Our unique herbal blend addresses gastric discomfort and bloating effectively.",
    glowColor: "rgba(16, 185, 129, 0.2)",
    accentColor: "#3daa6a",
    image: "shrijusukhol.png"
  },
  {
    id: "prod_2",
    name: "Mitoflush",
    label: "Constipation Relief",
    price: "₹750",
    priceNum: 750,
    size: "100gm · Natural Formula",
    titleWord: "Constipation Relief",
    desc: "Mitoflush is engineered to provide lasting relief from constipation. Gently cleanses your system and promotes regular, smooth bowel movements.",
    glowColor: "rgba(5, 150, 105, 0.2)",
    accentColor: "#2e7d4f",
    image: "mitroflush.png"
  },
  {
    id: "prod_3",
    name: "Easylaxx",
    label: "Acidity Relief",
    price: "₹750",
    priceNum: 750,
    size: "100gm · Advanced Formula",
    titleWord: "Acidity",
    desc: "Easylaxx provides effective relief from acidity and heartburn. Experience soothing digestive harmony and freedom from burning sensations.",
    glowColor: "rgba(16, 185, 129, 0.2)",
    accentColor: "#4a7c59",
    image: "easylaxx.png"
  }
];

// ── State ─────────────────────────────────────
let currentProduct = 0;
let autoPlayInterval = null;
let progressValue = 0;
let cart = [];
try {
  const savedCart = localStorage.getItem('neeva_cart');
  if (savedCart) cart = JSON.parse(savedCart);
  if (!Array.isArray(cart)) cart = [];
} catch (e) {
  console.error("Cart recovery failed", e);
  cart = [];
}
let currentUser = null;

const AUTO_PLAY_DURATION = 4000;

// ── UI Logic (Hero Carousel) ──────────────────
const productImages = document.querySelectorAll('.product-img');
const selectors = document.querySelectorAll('.prod-sel');
const heroTitle = document.getElementById('heroTitle');
const heroAccent = document.getElementById('heroAccent');
const heroDesc = document.getElementById('heroDesc');
const heroSize = document.getElementById('heroSize');
const heroPrice = document.getElementById('heroPrice');
const flavorLabel = document.getElementById('flavorLabel');
const productGlow = document.getElementById('productGlow');
const progressFill = document.getElementById('progressFill');

function switchToProduct(index) {
  if (index === currentProduct) return;
  const prev = currentProduct;
  currentProduct = index;
  if (productImages[prev]) {
    productImages[prev].classList.remove('active');
    productImages[prev].classList.add('exit');
    setTimeout(() => productImages[prev].classList.remove('exit'), 700);
  }
  if (productImages[index]) productImages[index].classList.add('active');
  const p = products[index];
  animateTextChange(heroAccent, p.titleWord);
  animateTextChange(heroDesc, p.desc);
  animateTextChange(heroSize, p.size);
  animateTextChange(heroPrice, p.price);
  animateTextChange(flavorLabel, p.label);
  if (productGlow) {
    productGlow.style.background = `radial-gradient(circle, ${p.glowColor} 0%, rgba(16, 185, 129, 0.02) 50%, transparent 70%)`;
  }
  selectors.forEach((sel, i) => sel.classList.toggle('active', i === index));
  resetProgress();
}

function animateTextChange(el, newText) {
  if (!el) return;
  el.style.opacity = '0';
  el.style.transform = 'translateY(12px)';
  setTimeout(() => {
    el.textContent = newText;
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
    el.style.transition = 'all 0.4s ease';
  }, 200);
}

function resetProgress() {
  if (!progressFill) return;
  progressFill.style.width = '0%';
  progressFill.style.transition = 'none';
  requestAnimationFrame(() => {
    progressFill.style.transition = `width ${AUTO_PLAY_DURATION}ms linear`;
    progressFill.style.width = '100%';
  });
}

function startAutoPlay() {
  resetProgress();
  autoPlayInterval = setInterval(() => {
    switchToProduct((currentProduct + 1) % products.length);
  }, AUTO_PLAY_DURATION);
}

function stopAutoPlay() {
  clearInterval(autoPlayInterval);
}

// ── Cart Logic ────────────────────────────────
function addToCart(name, price) {
  try {
    const existing = cart.find(i => i.name === name);
    if (existing) existing.qty++;
    else cart.push({ name, price, qty: 1 });
    localStorage.setItem('neeva_cart', JSON.stringify(cart));
    updateCart();
    
    document.getElementById('cartSidebar')?.classList.add('active');
    document.getElementById('cartOverlay')?.classList.add('active');
    
    showToast(`${name} added to cart! 🌿`);
  } catch (e) {
    console.error("Add to cart failed", e);
  }
}

function updateCart() {
  const cartItems = document.getElementById('cartItems');
  const cartFooter = document.getElementById('cartFooter');
  const cartCount = document.getElementById('cartCount');
  const totalAmount = document.getElementById('totalAmount');
  if (!cartItems || !cartCount) return;
  const count = cart.reduce((a, i) => a + i.qty, 0);
  cartCount.textContent = count;
  const total = cart.reduce((a, i) => a + i.price * i.qty, 0);
  totalAmount.textContent = `₹${total.toLocaleString('en-IN')}`;
  if (cart.length === 0) {
    cartItems.innerHTML = `<div class="cart-empty"><div class="cart-empty-icon">🛒</div><p>Your cart is empty</p></div>`;
    cartFooter.style.display = 'none';
  } else {
    cartFooter.style.display = 'block';
    cartItems.innerHTML = cart.map((item, idx) => `
      <div class="cart-item">
        <div style="font-size:1.5rem;">🌿</div>
        <div style="flex:1;">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">₹${item.price.toLocaleString('en-IN')}</div>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="changeQty(${idx}, -1)">−</button>
            <span class="qty-num">${item.qty}</span>
            <button class="qty-btn" onclick="changeQty(${idx}, 1)">+</button>
          </div>
        </div>
        <button onclick="removeFromCart(${idx})" class="cart-item-remove">✕</button>
      </div>`).join('');
  }
}

function changeQty(idx, delta) {
  if (!cart[idx]) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  localStorage.setItem('neeva_cart', JSON.stringify(cart));
  updateCart();
}

function removeFromCart(idx) {
  cart.splice(idx, 1);
  localStorage.setItem('neeva_cart', JSON.stringify(cart));
  updateCart();
}

// ── Firebase Auth & User Actions ──────────────

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const isLocalAdmin = localStorage.getItem('neeva_local_admin') === 'true';
    let userData;
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
        userData = {
            name: user.displayName || 'User',
            email: user.email,
            role: 'user',
            created_at: serverTimestamp()
        };
        await setDoc(userRef, userData);
    } else {
        userData = userDoc.data();
    }

    if (userData) {
        updateAuthUI(userData);
        const path = window.location.pathname.toLowerCase();
        if (path.includes('profile')) {
            populateProfileFields(userData);
            loadAddresses();
        }
        if (path.includes('orders')) {
            loadUserOrders();
        }
        updateHeaderStats();
    }
  } else {
    currentUser = null;
    updateAuthUI(null);
    const path = window.location.pathname.toLowerCase();
    if (path.includes('profile') || path.includes('orders')) {
        window.location.href = 'index.html';
    }
  }
});

async function updateHeaderStats() {
    if (!currentUser) return;
    try {
      const q = query(collection(db, "orders"), where("userId", "==", currentUser.uid));
      const snap = await getDocs(q);
      if (document.getElementById('totalCount')) document.getElementById('totalCount').textContent = snap.size;
    } catch(e) {}
}

function updateAuthUI(user) {
    const loginBtn = document.getElementById('loginOpenBtn');
    const userStatus = document.getElementById('userProfile');
    const userNameEl = document.getElementById('userName');
    const navLinks = document.getElementById('navLinks');
    const sideName = document.getElementById('sideUserName');
    const sideEmail = document.getElementById('sideUserEmail');
    const nameInitial = document.getElementById('nameInitial');

    document.getElementById('adminLink')?.remove();

    if (user) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (userStatus) userStatus.style.display = 'flex';
        if (userNameEl) userNameEl.textContent = user.name;
        if (sideName) sideName.textContent = user.name;
        if (sideEmail) sideEmail.textContent = user.email;
        if (nameInitial) nameInitial.textContent = user.name.charAt(0).toUpperCase();

        if (user.role === 'admin' && navLinks) {
            const li = document.createElement('li');
            li.id = 'adminLink';
            li.innerHTML = '<a href="admin.html" class="nav-link" style="color:var(--amber-light); font-weight:700;">📊 Dashboard</a>';
            navLinks.appendChild(li);
        }
    } else {
        if (loginBtn) loginBtn.style.display = 'block';
        if (userStatus) userStatus.style.display = 'none';
    }
}

async function handleGoogleLogin() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        await setDoc(doc(db, "users", user.uid), {
            name: user.displayName, 
            email: user.email, 
            role: 'user',
            updated_at: serverTimestamp()
        }, { merge: true });
        toggleAuth(false);
        showToast('Signed in with Google! 🌿');
    } catch (err) {
        console.error(err);
        showToast('Google Sign-in failed');
    }
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  if (!toast) return;
  toastMsg.textContent = msg;
  toast.classList.add('active');
  setTimeout(() => toast.classList.remove('active'), 3000);
}

function toggleAuth(show = true) {
  document.getElementById('authModal')?.classList.toggle('active', show);
  document.getElementById('authOverlay')?.classList.toggle('active', show);
}

function closeCart() {
    document.getElementById('cartSidebar')?.classList.remove('active');
    document.getElementById('cartOverlay')?.classList.remove('active');
}

window.populateProfileFields = function(data) {
    if (document.getElementById('profName')) document.getElementById('profName').value = data.name || '';
    if (document.getElementById('profEmail')) document.getElementById('profEmail').value = data.email || '';
    if (document.getElementById('profPhone')) document.getElementById('profPhone').value = data.phone || '';
    if (document.getElementById('profFlat')) document.getElementById('profFlat').value = data.flat || '';
    if (document.getElementById('profStreet')) document.getElementById('profStreet').value = data.street || '';
    if (document.getElementById('profCity')) document.getElementById('profCity').value = data.city || '';
    if (document.getElementById('profState')) document.getElementById('profState').value = data.state || '';
    if (document.getElementById('profPincode')) document.getElementById('profPincode').value = data.pincode || '';
}

window.loadAddresses = async function() {
    const list = document.getElementById('addressList');
    if (!list || !currentUser) return;
    const q = query(collection(db, "addresses"), where("userId", "==", currentUser.uid));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        list.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:20px;">No addresses found.</p>';
        return;
    }
    list.innerHTML = snapshot.docs.map(d => {
        const addr = d.data();
        return `<div class="address-card" style="background:white; border:1px solid #eee; padding:20px; border-radius:15px;">
            <strong>${addr.name}</strong><br>${addr.street}, ${addr.city}<br>${addr.state} - ${addr.pincode}<br>
            <button onclick="deleteAddress('${d.id}')" style="margin-top:10px; color:red; border:none; background:none; cursor:pointer; font-size:0.8rem;">Remove</button>
        </div>`;
    }).join('');
}

function deleteAddress(id) {
    if (!confirm('Remove this address?')) return;
    deleteDoc(doc(db, "addresses", id)).then(() => loadAddresses());
}

window.loadUserOrders = async function() {
    const activeList = document.getElementById('activeOrdersList');
    if (!activeList || !currentUser) return;
    const q = query(collection(db, "orders"), where("userId", "==", currentUser.uid), orderBy("created_at", "desc"));
    const snapshot = await getDocs(q);
    if (snapshot.empty) { activeList.innerHTML = '<p>No orders yet.</p>'; return; }
    activeList.innerHTML = snapshot.docs.map(d => {
        const order = d.data();
        return `<div class="order-card" style="background:white; border:1px solid #eee; padding:25px; border-radius:20px; margin-bottom:15px;">
            <div style="display:flex; justify-content:space-between;">
                <div><strong>Order #${d.id.slice(0,8)}</strong></div>
                <div style="color:var(--amber-dark); font-weight:700;">${order.status}</div>
            </div>
            <div style="margin-top:10px; font-size:0.9rem;">
                Total: ₹${order.total_amount}<br>
                Items: ${order.items.map(i => `${i.name} (x${i.qty})`).join(', ')}
            </div>
        </div>`;
    }).join('');
    window.updateOrderStats?.();
}

function openCheckout() {
    document.getElementById('checkoutOverlay')?.classList.add('active');
    document.getElementById('checkoutModal')?.classList.add('active');
    const useProfileBtn = document.getElementById('useProfileBtn');
    if (useProfileBtn) {
        useProfileBtn.style.display = currentUser ? 'block' : 'none';
    }
    fetchProfileForCheckout();
}

function closeCheckout() {
    document.getElementById('checkoutOverlay')?.classList.remove('active');
    document.getElementById('checkoutModal')?.classList.remove('active');
    const stepShip = document.getElementById('stepShipping');
    if (stepShip) stepShip.style.display = 'block';
    const stepSucc = document.getElementById('stepSuccess');
    if (stepSucc) stepSucc.style.display = 'none';
}

async function fetchProfileForCheckout() {
    if (!currentUser) return;
    const docSnap = await getDoc(doc(db, "users", currentUser.uid));
    if (docSnap.exists()) {
        const data = docSnap.data();
        if (document.getElementById('shipName')) document.getElementById('shipName').value = data.name || '';
        if (document.getElementById('shipPhone')) document.getElementById('shipPhone').value = data.phone || '';
        if (document.getElementById('shipEmail')) document.getElementById('shipEmail').value = data.email || (currentUser?.email || '');
        if (document.getElementById('shipAddress')) document.getElementById('shipAddress').value = (data.flat || '') + ' ' + (data.street || '') + ' ' + (data.city || '');
        if (document.getElementById('shipCity')) document.getElementById('shipCity').value = data.city || '';
        if (document.getElementById('shipPincode')) document.getElementById('shipPincode').value = data.pincode || '';
    } else if (currentUser) {
        if (document.getElementById('shipEmail')) document.getElementById('shipEmail').value = currentUser.email || '';
    }
}

// ── Initialization Logic ──────────────────────
async function initializeAppLogic() {
  try {
    updateCart();
    if (selectors.length > 0) startAutoPlay();

    document.getElementById('loginOpenBtn')?.addEventListener('click', () => toggleAuth(true));
    document.getElementById('authClose')?.addEventListener('click', () => toggleAuth(false));
    document.getElementById('authOverlay')?.addEventListener('click', () => toggleAuth(false));
    
    document.getElementById('hamburger')?.addEventListener('click', () => {
        document.getElementById('navLinks')?.classList.toggle('active');
    });

    document.getElementById('cartBtn')?.addEventListener('click', () => {
        document.getElementById('cartSidebar')?.classList.add('active');
        document.getElementById('cartOverlay')?.classList.add('active');
    });
    document.getElementById('cartClose')?.addEventListener('click', closeCart);
    document.getElementById('cartOverlay')?.addEventListener('click', closeCart);

    document.getElementById('tabLogin')?.addEventListener('click', () => {
        document.getElementById('tabLogin').classList.add('active');
        document.getElementById('tabSignup').classList.remove('active');
        document.getElementById('signupFields').style.display = 'none';
        document.getElementById('authTitle').textContent = 'Welcome Back';
    });
    document.getElementById('tabSignup')?.addEventListener('click', () => {
        document.getElementById('tabSignup').classList.add('active');
        document.getElementById('tabLogin').classList.remove('active');
        document.getElementById('signupFields').style.display = 'block';
        document.getElementById('authTitle').textContent = 'Create Account';
    });

    document.getElementById('authForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('authEmail').value;
        const password = document.getElementById('authPass').value;
        const name = document.getElementById('regName')?.value;
        const msg = document.getElementById('authMsg');
        
        if (email === 'neeva-admin@gmail.com' && password === 'neeva@2410') {
            localStorage.setItem('neeva_local_admin', 'true');
            window.location.href = 'admin.html';
            return;
        }

        try {
            const isLogin = document.getElementById('tabLogin').classList.contains('active');
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const cred = await createUserWithEmailAndPassword(auth, email, password);
                await setDoc(doc(db, "users", cred.user.uid), {
                    name: name || 'User',
                    email: email,
                    role: 'user',
                    created_at: serverTimestamp()
                });
            }
            toggleAuth(false);
        } catch (err) {
            if (msg) msg.textContent = err.message;
        }
    });

    document.getElementById('checkoutStartBtn')?.addEventListener('click', () => {
        if (cart.length === 0) { showToast('Cart is empty'); return; }
        openCheckout();
    });

    document.getElementById('checkoutClose')?.addEventListener('click', closeCheckout);
    document.getElementById('checkoutOverlay')?.addEventListener('click', closeCheckout);
    
    document.getElementById('logoutBtn')?.addEventListener('click', () => signOut(auth));
    document.getElementById('logoutBtnAlt')?.addEventListener('click', () => signOut(auth));

    // Carousel Dot Listeners
    selectors.forEach((sel, i) => {
        sel.addEventListener('click', () => {
            stopAutoPlay();
            switchToProduct(i);
            setTimeout(startAutoPlay, AUTO_PLAY_DURATION);
        });
    });

    // Hero Buy Button
    document.getElementById('heroBuyBtn')?.addEventListener('click', () => {
        document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
    });

    // Address Form
    document.getElementById('addressForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) return;
        const addrData = {
            userId: currentUser.uid,
            name: document.getElementById('addName').value,
            phone: document.getElementById('addPhone').value,
            street: document.getElementById('addStreet').value,
            city: document.getElementById('addCity').value,
            state: document.getElementById('addState').value,
            pincode: document.getElementById('addPincode').value,
            created_at: serverTimestamp()
        };
        await addDoc(collection(db, "addresses"), addrData);
        showToast('Address Saved!');
        loadAddresses();
    });

    // Shipping Form
    document.getElementById('shippingForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const total = cart.reduce((a, i) => a + i.price * i.qty, 0);
        const orderData = {
            userId: currentUser?.uid || 'guest',
            items: cart,
            total_amount: total,
            status: 'PENDING',
            shipping: {
                name: document.getElementById('shipName').value,
                phone: document.getElementById('shipPhone').value,
                email: document.getElementById('shipEmail')?.value || (currentUser?.email || ''),
                address: document.getElementById('shipAddress').value,
                city: document.getElementById('shipCity').value,
                pincode: document.getElementById('shipPincode').value
            },
            created_at: serverTimestamp()
        };
        const docRef = await addDoc(collection(db, "orders"), orderData);
        window.currentOrderRef = docRef;
        document.getElementById('stepShipping').style.display = 'none';
        document.getElementById('stepPayment').style.display = 'block';
        document.getElementById('checkoutTotal').textContent = `₹${total.toLocaleString('en-IN')}`;
    });

    // Payment Logic (Razorpay)
    document.getElementById('payNowBtn')?.addEventListener('click', async () => {
        if (!window.currentOrderRef) return;
        const total = cart.reduce((a, i) => a + i.price * i.qty, 0);
        const options = {
            "key": "rzp_live_SJZMNaknBDWPqH",
            "amount": total * 100,
            "currency": "INR",
            "name": "Neeva Ayurveda",
            "handler": async function (res) {
                await updateDoc(window.currentOrderRef, { status: 'PAID', razorpay_id: res.razorpay_payment_id });
                cart = [];
                localStorage.removeItem('neeva_cart');
                updateCart();
                document.getElementById('stepPayment').style.display = 'none';
                document.getElementById('stepSuccess').style.display = 'block';
            }
        };
        new Razorpay(options).open();
    });

  } catch (e) {
    console.error("Initialization error", e);
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initializeAppLogic);
} else {
  initializeAppLogic();
}
