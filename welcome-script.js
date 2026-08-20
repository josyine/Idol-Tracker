const PRICE_PER_GROUP = 4.99;
let currentLang = 'en';

const dict = {
    en: {
        subtitle: "Following the footsteps of your favorite artists",
        step1: "1. Account Details", fname: "First Name", lname: "Last Name", email: "Email Address",
        step2: "2. Choose Your Passes", passDesc: "Select the groups you want to unlock. (4.99€ per group)",
        totalDue: "Total Due:", payBtnEmpty: "Select a group to pay", payBtnActive: "Pay {price} € & Unlock",
        processing: "Processing payment securely..."
    },
    fr: {
        subtitle: "Sur les traces de vos artistes préférés",
        step1: "1. Détails du compte", fname: "Prénom", lname: "Nom", email: "Adresse Email",
        step2: "2. Choisissez vos Pass", passDesc: "Sélectionnez les groupes à débloquer. (4.99€ par groupe)",
        totalDue: "Total à payer :", payBtnEmpty: "Sélectionnez un groupe", payBtnActive: "Payer {price} € & Débloquer",
        processing: "Traitement sécurisé du paiement..."
    }
};

function updateLangUI() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if(dict[currentLang][key]) el.textContent = dict[currentLang][key];
    });
    document.getElementById('lang-en').classList.toggle('active', currentLang === 'en');
    document.getElementById('lang-fr').classList.toggle('active', currentLang === 'fr');
    updatePrice(); // Met à jour le texte du bouton
}

document.getElementById('lang-en').addEventListener('click', () => { currentLang = 'en'; localStorage.setItem('lang', 'en'); updateLangUI(); });
document.getElementById('lang-fr').addEventListener('click', () => { currentLang = 'fr'; localStorage.setItem('lang', 'fr'); updateLangUI(); });

const checkboxes = document.querySelectorAll('.group-checkbox');
const priceDisplay = document.getElementById('price-display');
const payBtn = document.getElementById('pay-btn');

function updatePrice() {
    const selectedCount = document.querySelectorAll('.group-checkbox:checked').length;
    const totalPrice = selectedCount * PRICE_PER_GROUP;
    priceDisplay.textContent = `${totalPrice.toFixed(2)} €`;
    if (selectedCount > 0) {
        payBtn.disabled = false;
        payBtn.textContent = dict[currentLang].payBtnActive.replace('{price}', totalPrice.toFixed(2));
    } else {
        payBtn.disabled = true;
        payBtn.textContent = dict[currentLang].payBtnEmpty;
    }
}
checkboxes.forEach(cb => cb.addEventListener('change', updatePrice));

document.getElementById('checkout-form').addEventListener('submit', function(e) {
    e.preventDefault();
    if(document.querySelectorAll('.group-checkbox:checked').length === 0) return;
    payBtn.style.display = 'none';
    document.getElementById('payment-loader').classList.remove('hidden');
    setTimeout(() => { window.location.href = 'map.html'; }, 2000);
});

// Init
if(localStorage.getItem('lang')) currentLang = localStorage.getItem('lang');
updateLangUI();
