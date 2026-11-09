const products = [
  {
    name: "ELG120",
    subtitle: "Energía",
    description: "Gel energético en polvo con maltodextrina + fructosa 2:1."
  },
  {
    name: "ELD100",
    subtitle: "Hidratación",
    description: "Bebida isotónica en polvo con carbohidratos + sodio."
  },
  {
    name: "ELC500",
    subtitle: "Sodio",
    description: "Electrolyte shot con 500 mg de sodio por dosis."
  }
];

function scrollToSection(sectionId) {
  document.getElementById(sectionId).scrollIntoView({ behavior: "smooth" });
}

function renderProducts() {
  const container = document.getElementById("productsGrid");
  container.innerHTML = products
    .map(product => `
      <article class="product-card">
        <div class="card-label">Producto</div>
        <h3>${product.name}</h3>
        <div class="subtitle">${product.subtitle}</div>
        <div class="description">${product.description}</div>
        <button onclick="showProduct('${product.name}')">Más información</button>
      </article>
    `)
    .join("");
}

function showProduct(productName) {
  if (productName === "ELG120") {
    window.location.href = "elg120.html";
    return;
  }

  if (productName === "ELD100") {
    window.location.href = "eld100.html";
    return;
  }

  if (productName === "ELC500") {
    window.location.href = "elc500.html";
    return;
  }
}

renderProducts();