const firebaseConfig = {
    apiKey: "AIzaSyBH0g83qEUERiDBjgMgRnSJ-s2lvpPtkz4",
    authDomain: "vitrina-e0a00.firebaseapp.com",
    databaseURL: "https://vitrina-e0a00-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "vitrina-e0a00",
    storageBucket: "vitrina-e0a00.firebasestorage.app",
    messagingSenderId: "182787477088",
    appId: "1:182787477088:web:35827926e1e885bb0bfd05"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let products = [];
let cart = [];

database.ref('skladData/products').on('value', (s) => { products = s.val() || []; renderCatalog(); });

// УНИВЕРСАЛЬНОЕ ОТКРЫТИЕ (Click + Touch)
function toggleCart() {
    const bar = document.getElementById('cart-bar');
    const btn = document.getElementById('main-cart-btn');
    bar.classList.toggle('expanded');
    btn.innerText = bar.classList.contains('expanded') ? "СКРЫТЬ" : "ОФОРМИТЬ";
}

const interactionZones = ['cart-touch-zone', 'cart-header-zone', 'main-cart-btn'];
interactionZones.forEach(id => {
    const el = document.getElementById(id);
    if(el) {
        el.addEventListener('click', (e) => { e.stopPropagation(); toggleCart(); });
        el.addEventListener('touchstart', (e) => { e.stopPropagation(); e.preventDefault(); toggleCart(); }, {passive: false});
    }
});

function renderCatalog() {
    const catalog = document.getElementById('catalog');
    const visible = products.filter(p => p.hidden !== true);
    catalog.innerHTML = visible.map(p => {
        const stock = (p.history || []).reduce((s, h) => s + h.qty, 0);
        const inCart = cart.find(i => i.id === p.id);
        const isAvail = stock > 0;
        return `
            <div class="product-card">
                <div class="product-icon">${p.icon || '📦'}</div>
                <div class="product-name">${p.name}</div>
                <div class="stock-tag ${isAvail ? 'in-stock' : 'is-preorder'}">${isAvail ? 'В наличии' : 'Под заказ'}</div>
                <div class="product-price">${p.price} ₽</div>
                ${inCart ? `
                    <div class="stepper">
                        <button class="btn-step" onclick="updateQty(${p.id},-1)">-</button>
                        <span style="font-weight:900">${inCart.qty}</span>
                        <button class="btn-step" onclick="updateQty(${p.id},1)">+</button>
                    </div>` : `
                    <button class="btn-action ${isAvail?'buy-mode':'preorder-mode'}" onclick="updateQty(${p.id},1)">
                        ${isAvail?'В корзину':'Предзаказ'}
                    </button>`}
            </div>`;
    }).join('');
}

function updateQty(pId, delta) {
    const p = products.find(x => x.id === pId);
    const ex = cart.find(x => x.id === pId);
    if (ex) { ex.qty += delta; if (ex.qty <= 0) cart = cart.filter(x => x.id !== pId); }
    else if (delta > 0) { 
        const stock = (p.history || []).reduce((s, h) => s + h.qty, 0);
        cart.push({ id: p.id, name: p.name, price: p.price, qty: 1, isPreorder: stock <= 0 }); 
    }
    renderCatalog(); updateCartBar();
}

function updateCartBar() {
    const bar = document.getElementById('cart-bar');
    if (cart.length === 0) { bar.style.display = 'none'; bar.classList.remove('expanded'); return; }
    bar.style.display = 'block';
    let total = 0, count = 0;
    document.getElementById('cart-items').innerHTML = cart.map(i => {
        total += i.price * i.qty; count += i.qty;
        return `<div class="cart-item"><span>${i.name} x${i.qty}</span><b>${i.price*i.qty} ₽</b></div>`;
    }).join('');
    document.getElementById('bar-total').innerText = total + ' ₽';
    document.getElementById('bar-count').innerText = count + ' тов.';
}

function togglePhoneField() {
    const isNo = document.getElementById('noPhoneCheck').checked;
    const inp = document.getElementById('userPhone');
    const wrn = document.getElementById('phoneWarning');
    inp.required = !isNo;
    inp.style.opacity = isNo ? "0.4" : "1";
    inp.placeholder = isNo ? "Номер не нужен" : "📞 +7 (999) 000-00-00";
    wrn.style.display = isNo ? "block" : "none";
}

function sendOrder() {
    const name = document.getElementById('userName').value.trim();
    const phone = document.getElementById('userPhone').value.trim();
    const noPh = document.getElementById('noPhoneCheck').checked;
    if (!name || (!noPh && !phone)) return alert("Заполните имя и номер!");

    const order = {
        id: Date.now(),
        clientName: noPh ? `${name} (?)` : `${name} (${phone})`,
        date: new Date().toLocaleString(),
        items: cart.map(i => ({ name: i.isPreorder ? i.name + " (ПРЕДЗАКАЗ)" : i.name, qty: i.qty }))
    };

    database.ref('skladData/incomingOrders').get().then(snap => {
        let orders = snap.val() || [];
        orders.push(order);
        database.ref('skladData/incomingOrders').set(orders).then(() => {
            alert("🚀 Заказ отправлен!");
            cart = []; updateCartBar(); renderCatalog();
            document.getElementById('orderForm').reset();
            togglePhoneField();
        });
    });
}
