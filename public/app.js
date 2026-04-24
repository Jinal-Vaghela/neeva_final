/* =============================================
   app.js — AyurVeda Pure Interactive Logic
   Firebase Edition (Serverless)
   ============================================= */

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
let cart = JSON.parse(localStorage.getItem('neeva_cart')) || [];
let currentUser = null;

const AUTO_PLAY_DURATION = 4000;

// ── UI Logic (Ported from legacy) ─────────────
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
  productGlow.style.background = `radial-gradient(circle, ${p.glowColor} 0%, rgba(16, 185, 129, 0.02) 50%, transparent 70%)`;
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

// Event Listeners for UI
selectors.forEach((sel, i) => {
  sel.addEventListener('click', () => {
    stopAutoPlay();
    switchToProduct(i);
    setTimeout(startAutoPlay, AUTO_PLAY_DURATION);
  });
});

document.getElementById('heroBuyBtn')?.addEventListener('click', () => {
  const p = products[currentProduct];
  addToCart(p.name, p.priceNum);
});

// ── Cart Logic ────────────────────────────────
window.addToCart = function(name, price) {
  const existing = cart.find(i => i.name === name);
  if (existing) existing.qty++;
  else cart.push({ name, price, qty: 1 });
  localStorage.setItem('neeva_cart', JSON.stringify(cart));
  updateCart();
  
  // Automatically open cart to show the addition
  document.getElementById('cartSidebar')?.classList.add('active');
  document.getElementById('cartOverlay')?.classList.add('active');
  
  showToast(`${name} added to cart! 🌿`);
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

window.changeQty = (idx, delta) => {
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  localStorage.setItem('neeva_cart', JSON.stringify(cart));
  updateCart();
}

window.removeFromCart = (idx) => {
  cart.splice(idx, 1);
  localStorage.setItem('neeva_cart', JSON.stringify(cart));
  updateCart();
}

// ── Firebase Auth & User Actions ──────────────

// Auth Listener
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    
    // Check for local admin flag
    const isLocalAdmin = localStorage.getItem('neeva_local_admin') === 'true';
    
    let userData;
    if (isLocalAdmin && !user) {
        // Handle case where we only have the local flag (optional but good for consistency)
        userData = { name: "Neeva Admin", email: "neeva-admin@gmail.com", role: "admin" };
    } else if (user) {
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
            if (!userData.role) {
                userData.role = 'user';
                await updateDoc(userRef, { role: 'user' });
            }
        }
    }

    if (userData) {
        updateAuthUI(userData);
        
        if (window.location.pathname.includes('profile.html')) {
            populateProfileFields(userData);
            loadAddresses();
        }
        if (window.location.pathname.includes('orders.html')) {
            loadUserOrders();
        }
        updateHeaderStats();
    } else {
        currentUser = null;
        updateAuthUI(null);
        if (window.location.pathname.includes('profile.html') || window.location.pathname.includes('orders.html')) {
            window.location.href = 'index.html';
        }
    }
});

async function updateHeaderStats() {
    if (!currentUser) return;
    const q = query(collection(db, "orders"), where("userId", "==", currentUser.uid));
    const snap = await getDocs(q);
    if (document.getElementById('totalCount')) document.getElementById('totalCount').textContent = snap.size;
}

function updateAuthUI(user) {
    const loginBtn = document.getElementById('loginOpenBtn');
    const userStatus = document.getElementById('userProfile');
    const userNameEl = document.getElementById('userName');
    const navLinks = document.getElementById('navLinks');
    
    // Sidebar Fields (Profile/Orders pages)
    const sideName = document.getElementById('sideUserName');
    const sideEmail = document.getElementById('sideUserEmail');
    const nameInitial = document.getElementById('nameInitial');

    // Remove existing admin link if any
    document.getElementById('adminLink')?.remove();

    if (user) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (userStatus) userStatus.style.display = 'flex';
        if (userNameEl) userNameEl.textContent = user.name;

        // Sidebar Update
        if (sideName) sideName.textContent = user.name;
        if (sideEmail) sideEmail.textContent = user.email;
        if (nameInitial) nameInitial.textContent = user.name.charAt(0).toUpperCase();

        // If admin, show dashboard link
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

// Login/Signup
const authForm = document.getElementById('authForm');
const isLogin = () => document.getElementById('tabLogin').classList.contains('active');

authForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPass').value;
    const name = document.getElementById('regName')?.value;
    const msg = document.getElementById('authMsg');
    
    try {
        // --- HARDCODED ADMIN BYPASS ---
        if (email === 'neeva-admin@gmail.com' && password === 'neeva@2410') {
            localStorage.setItem('neeva_local_admin', 'true');
            showToast('Admin access granted! 📊');
            toggleAuth(false);
            
            // Immediately show the Dashboard link in the navbar
            updateAuthUI({ name: "Neeva Admin", email: email, role: "admin" });
            return;
        }
        // ------------------------------

        if (isLogin()) {
            await signInWithEmailAndPassword(auth, email, password);
            showToast('Welcome back! 🌿');
        } else {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, "users", cred.user.uid), {
                name, email, role: 'user', created_at: serverTimestamp()
            });
            showToast('Account created! 🌿');
        }
        toggleAuth(false);
    } catch (err) {
        msg.textContent = err.message;
        msg.style.color = '#ff6b6b';
    }
});

// Google Login
window.handleGoogleLogin = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        
        // Ensure user exists in Firestore with 'user' role if new
        await setDoc(doc(db, "users", user.uid), {
            name: user.displayName, 
            email: user.email, 
            role: 'user', // Ensure default role is user
            updated_at: serverTimestamp()
        }, { merge: true });
        
        toggleAuth(false);
        showToast('Signed in with Google! 🌿');
    } catch (err) {
        console.error(err);
        showToast('Google Sign-in failed');
    }
}

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', () => signOut(auth));

// Forgot Password
document.getElementById('forgotPassLink')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    if (!email) {
        showToast('Please enter your email first 📧');
        return;
    }
    try {
        await sendPasswordResetEmail(auth, email);
        showToast('Reset link sent to your email! 🌿');
    } catch (err) {
        showToast(err.message);
    }
});

// ── Profile & Addresses (Firestore) ───────────

async function populateProfileFields(data) {
    if (document.getElementById('profName')) document.getElementById('profName').value = data.name || '';
    if (document.getElementById('profEmail')) document.getElementById('profEmail').value = data.email || '';
    if (document.getElementById('profPhone')) document.getElementById('profPhone').value = data.phone || '';
    if (document.getElementById('profCity')) document.getElementById('profCity').value = data.city || '';
    if (document.getElementById('profState')) document.getElementById('profState').value = data.state || '';
    if (document.getElementById('profPincode')) document.getElementById('profPincode').value = data.pincode || '';
}

document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    const btn = document.getElementById('profUpdateBtn');
    btn.textContent = 'Updating...';
    
    const updateData = {
        name: document.getElementById('profName').value,
        phone: document.getElementById('profPhone').value,
        city: document.getElementById('profCity').value,
        state: document.getElementById('profState').value,
        pincode: document.getElementById('profPincode').value,
        updated_at: serverTimestamp()
    };
    
    try {
        await updateDoc(doc(db, "users", currentUser.uid), updateData);
        showToast('Profile Updated! ✨');
    } catch (err) {
        showToast('Update failed');
    } finally {
        btn.textContent = 'Update Profile';
    }
});

async function loadAddresses() {
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
        return `
            <div class="address-card" style="background:white; border:1px solid #eee; padding:20px; border-radius:15px; position:relative;">
                <strong>${addr.name}</strong><br>
                ${addr.street}, ${addr.city}<br>
                ${addr.state} - ${addr.pincode}<br>
                <button onclick="deleteAddress('${d.id}')" style="margin-top:10px; color:red; border:none; background:none; cursor:pointer; font-size:0.8rem;">Remove</button>
            </div>
        `;
    }).join('');
}

window.deleteAddress = async (id) => {
    if (!confirm('Remove this address?')) return;
    await deleteDoc(doc(db, "addresses", id));
    loadAddresses();
};

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
    window.closeAddressModal?.();
    loadAddresses();
});

// ── Orders (Firestore) ─────────────────────────

async function loadUserOrders() {
    const activeList = document.getElementById('activeOrdersList');
    if (!activeList || !currentUser) return;
    
    const q = query(collection(db, "orders"), where("userId", "==", currentUser.uid), orderBy("created_at", "desc"));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
        activeList.innerHTML = '<p>No orders yet.</p>';
        return;
    }
    
    activeList.innerHTML = snapshot.docs.map(d => {
        const order = d.data();
        return `
            <div class="order-card" style="background:white; border:1px solid #eee; padding:25px; border-radius:20px; margin-bottom:15px;">
                <div style="display:flex; justify-content:space-between;">
                    <div><strong>Order #${d.id.slice(0,8)}</strong></div>
                    <div style="color:var(--amber-dark); font-weight:700;">${order.status}</div>
                </div>
                <div style="margin-top:10px; font-size:0.9rem;">
                    Total: ₹${order.total_amount}<br>
                    Items: ${order.items.map(i => `${i.name} (x${i.qty})`).join(', ')}
                </div>
            </div>
        `;
    }).join('');
}

// ── Helpers & Initializers ─────────────────────

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

// Global modal toggles
window.openProfile = () => window.location.href = 'profile.html';
window.closeCart = () => {
    document.getElementById('cartSidebar')?.classList.remove('active');
    document.getElementById('cartOverlay')?.classList.remove('active');
}

// Initialize
window.addEventListener('DOMContentLoaded', async () => {
  updateCart();
  if (productImages.length > 0) startAutoPlay();
  
  // Modal Toggles
  document.getElementById('loginOpenBtn')?.addEventListener('click', () => toggleAuth(true));
  
  // Auth Tab Switching
  document.getElementById('tabLogin')?.addEventListener('click', () => {
      document.getElementById('tabLogin').classList.add('active');
      document.getElementById('tabSignup').classList.remove('active');
      document.getElementById('signupFields').style.display = 'none';
      document.getElementById('authTitle').textContent = 'Welcome Back';
      document.getElementById('authSubmitBtn').textContent = 'Sign in';
  });
  
  document.getElementById('tabSignup')?.addEventListener('click', () => {
      document.getElementById('tabSignup').classList.add('active');
      document.getElementById('tabLogin').classList.remove('active');
      document.getElementById('signupFields').style.display = 'block';
      document.getElementById('authTitle').textContent = 'Create Account';
      document.getElementById('authSubmitBtn').textContent = 'Sign up';
  });

  // Hamburger menu
  document.getElementById('hamburger')?.addEventListener('click', () => {
      document.getElementById('navLinks').classList.toggle('active');
  });

  // Sidebar Toggles
  document.getElementById('cartBtn')?.addEventListener('click', () => {
      document.getElementById('cartSidebar').classList.add('active');
      document.getElementById('cartOverlay').classList.add('active');
  });
  document.getElementById('cartClose')?.addEventListener('click', closeCart);
  document.getElementById('cartOverlay')?.addEventListener('click', closeCart);

  // Checkout Start Listener
  document.getElementById('checkoutStartBtn')?.addEventListener('click', () => {
      if (!currentUser) {
          showToast('Please login to checkout');
          toggleAuth(true);
          return;
      }
      if (cart.length === 0) {
          showToast('Cart is empty');
          return;
      }
      window.openCheckout();
  });

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
      await signOut(auth);
      showToast('Logged out successfully');
  });

  // Modal Closers
  document.getElementById('authClose')?.addEventListener('click', () => toggleAuth(false));
  document.getElementById('authOverlay')?.addEventListener('click', () => toggleAuth(false));
  document.getElementById('checkoutClose')?.addEventListener('click', () => window.closeCheckout());
  document.getElementById('checkoutOverlay')?.addEventListener('click', () => window.closeCheckout());

  // Shipping Form Submit -> Creates PENDING order
  document.getElementById('shippingForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button');
      btn.disabled = true;
      btn.textContent = 'Saving...';

      const total = cart.reduce((a, i) => a + i.price * i.qty, 0);
      document.getElementById('checkoutTotal').textContent = `₹${total.toLocaleString('en-IN')}`;

      const orderData = {
          userId: currentUser.uid,
          items: cart,
          total_amount: total,
          status: 'PENDING', 
          shipping: {
              name: document.getElementById('shipName').value,
              phone: document.getElementById('shipPhone').value,
              address: document.getElementById('shipAddress').value,
              city: document.getElementById('shipCity').value,
              pincode: document.getElementById('shipPincode').value
          },
          created_at: serverTimestamp()
      };

      try {
          // Create PENDING order
          const docRef = await addDoc(collection(db, "orders"), orderData);
          window.currentOrderRef = docRef; // Store for payment step

          // Switch to Payment
          document.getElementById('stepShipping').style.display = 'none';
          document.getElementById('stepPayment').style.display = 'block';
          
          showToast('Order saved! Please pay 💳');
      } catch (err) {
          console.error(err);
          showToast('Order failed');
          btn.disabled = false;
          btn.textContent = 'Continue to Payment';
      }
  });

  // Pay Now Button (Actual Razorpay Integration)
  document.getElementById('payNowBtn')?.addEventListener('click', async () => {
      if (!window.currentOrderRef) return;
      
      const btn = document.getElementById('payNowBtn');
      const orderTotal = cart.reduce((a, i) => a + i.price * i.qty, 0);
      
      // -- Razorpay Options -----
      const options = {
          "key": "rzp_live_SJZMNaknBDWPqH", 
          "amount": orderTotal * 100, // Amount in paise
          "currency": "INR",
          "name": "Neeva Ayurveda",
          "description": "Premium Herbal Supplements",
          "image": "logo.png",
          "handler": async function (response) {
              // SUCCESS CALLBACK
              btn.disabled = true;
              btn.textContent = 'Verifying Payment...';
              
              try {
                  await updateDoc(window.currentOrderRef, { 
                      status: 'PAID',
                      razorpay_payment_id: response.razorpay_payment_id,
                      razorpay_order_id: response.razorpay_order_id,
                      razorpay_signature: response.razorpay_signature,
                      payment_method: 'Razorpay'
                  });

                  // Clear Cart
                  cart = [];
                  localStorage.removeItem('neeva_cart');
                  updateCart();

                  // Show Success
                  document.getElementById('stepPayment').style.display = 'none';
                  document.getElementById('stepSuccess').style.display = 'block';
                  document.getElementById('displayOrderId').textContent = '#'+window.currentOrderRef.id.slice(0,8).toUpperCase();
                  showToast('Payment Successful! 🌿');
              } catch (err) {
                  console.error(err);
                  showToast('Database update failed. Contact support.');
              }
          },
          "prefill": {
              "name": document.getElementById('shipName').value,
              "email": currentUser.email,
              "contact": document.getElementById('shipPhone').value
          },
          "theme": {
              "color": "#10b981"
          },
          "modal": {
              "ondismiss": function() {
                  showToast('Payment Cancelled');
                  btn.disabled = false;
                  btn.textContent = 'Pay with Razorpay 💳';
              }
          }
      };

      const rzp1 = new Razorpay(options);
      rzp1.open();
  });

  // Admin Link Dynamic (If on Home)
  if (currentUser) {
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists() && userDoc.data().role === 'admin') {
          const navLinks = document.getElementById('navLinks');
          if (navLinks && !document.getElementById('adminNavLink')) {
              const li = document.createElement('li');
              li.id = 'adminNavLink';
              li.innerHTML = '<a href="admin.html" class="nav-link" style="color:var(--amber-light); font-weight:600;">Dashboard</a>';
              navLinks.appendChild(li);
          }
      }
  }

  // Profile pre-fill button in checkout
  document.getElementById('useProfileBtn')?.addEventListener('click', fetchProfileForCheckout);
});

/**
 * ⚠️ EXPOSING FOR GOOGLE BUTTON (Legacy compat)
 * Note: Firebase uses its own popup/redirect for Google Auth.
 * Use Result of Option 3 UI in index.html for a custom button.
 */
document.getElementById('google-login-btn')?.addEventListener('click', handleGoogleLogin);

// -- Checkout Flow (Firestore Integration) -----

window.openCheckout = () => {
    document.getElementById('checkoutOverlay').classList.add('active');
    document.getElementById('checkoutModal').classList.add('active');
    // Pre-fill from profile if possible
    fetchProfileForCheckout();
}

async function fetchProfileForCheckout() {
    if (!currentUser) return;
    const docSnap = await getDoc(doc(db, "users", currentUser.uid));
    if (docSnap.exists()) {
        const data = docSnap.data();
        if (document.getElementById('shipName')) document.getElementById('shipName').value = data.name || '';
        if (document.getElementById('shipPhone')) document.getElementById('shipPhone').value = data.phone || '';
        
        const fullAddr = [data.city, data.state].filter(Boolean).join(', ');
        if (document.getElementById('shipAddress')) document.getElementById('shipAddress').value = data.address || fullAddr || '';
        if (document.getElementById('shipCity')) document.getElementById('shipCity').value = data.city || '';
        if (document.getElementById('shipPincode')) document.getElementById('shipPincode').value = data.pincode || '';
    }
    loadSavedAddressesForCheckout();
}

async function loadSavedAddressesForCheckout() {
    const list = document.getElementById('checkoutAddrList');
    const container = document.getElementById('checkoutSavedAddresses');
    if (!list || !currentUser) return;

    const q = query(collection(db, "addresses"), where("userId", "==", currentUser.uid));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    list.innerHTML = snapshot.docs.map(d => {
        const addr = d.data();
        return `
            <div class="address-pill" onclick="selectCheckoutAddress(${JSON.stringify(addr).replace(/"/g, '&quot;')})">
                <strong>${addr.name}</strong>
                <span>${addr.city}, ${addr.pincode}</span>
            </div>
        `;
    }).join('');
}

window.selectCheckoutAddress = (addr) => {
    document.getElementById('shipName').value = addr.name;
    document.getElementById('shipPhone').value = addr.phone;
    document.getElementById('shipAddress').value = `${addr.street}`;
    document.getElementById('shipCity').value = addr.city;
    document.getElementById('shipPincode').value = addr.pincode;
    showToast('Address selected! 🌿');
};

window.closeCheckout = () => {
    document.getElementById('checkoutOverlay').classList.remove('active');
    document.getElementById('checkoutModal').classList.remove('active');
    document.getElementById('stepShipping').style.display = 'block';
    document.getElementById('stepSuccess').style.display = 'none';
};

// Final Polish
window.toggleAuth = toggleAuth;
