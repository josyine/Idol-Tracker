// Configuration du prix
const PRICE_PER_GROUP = 4.99;

// Éléments du DOM
const checkboxes = document.querySelectorAll('.group-checkbox');
const priceDisplay = document.getElementById('price-display');
const payBtn = document.getElementById('pay-btn');
const checkoutForm = document.getElementById('checkout-form');
const paymentLoader = document.getElementById('payment-loader');

// Fonction pour mettre à jour le prix dynamique
function updatePrice() {
    // Compte le nombre de checkboxes cochées
    const selectedCount = document.querySelectorAll('.group-checkbox:checked').length;
    
    // Calcul du prix total
    const totalPrice = selectedCount * PRICE_PER_GROUP;
    
    // Mise à jour de l'affichage
    priceDisplay.textContent = `${totalPrice.toFixed(2)} €`;

    // Activation / Désactivation du bouton
    if (selectedCount > 0) {
        payBtn.disabled = false;
        payBtn.textContent = `Pay ${totalPrice.toFixed(2)} € & Unlock`;
    } else {
        payBtn.disabled = true;
        payBtn.textContent = `Select a group to pay`;
    }
}

// Ajoute l'événement sur toutes les checkboxes
checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', updatePrice);
});

// Gestion de la soumission du formulaire (Faux paiement et redirection)
checkoutForm.addEventListener('submit', function(event) {
    event.preventDefault(); // Empêche le rechargement de la page

    // Vérifie qu'au moins un groupe est sélectionné (sécurité supplémentaire)
    const selectedCount = document.querySelectorAll('.group-checkbox:checked').length;
    if(selectedCount === 0) return;

    // Cache le bouton et affiche le loader d'animation
    payBtn.style.display = 'none';
    paymentLoader.classList.remove('hidden');

    // Simulation du temps de traitement bancaire (2 secondes)
    setTimeout(() => {
        // Redirection vers la page de la carte
        // ASSURE-TOI QUE TA CARTE S'APPELLE BIEN "map.html"
        window.location.href = 'map.html'; 
    }, 2000);
});
