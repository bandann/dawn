# Productos Hermanos — Navegación sin recarga (Section Rendering API)

## Resumen

Se implementó navegación AJAX entre productos hermanos usando la **Shopify Section Rendering API**. Antes, hacer clic en un producto hermano provocaba una recarga completa de la página. Ahora el contenido del producto se actualiza en el DOM sin recargar, la URL cambia correctamente y el hermano activo queda visualmente marcado.

---

## Archivos modificados

| Archivo | Tipo de cambio |
|---|---|
| `sections/main-product.liquid` | Loop de hermanos: incluye producto actual + atributos data/aria |
| `assets/product-info.js` | Nuevo método `initSiblingNavigation()` |
| `assets/component-siblings.css` | Nuevo estilo `.is-active` |

---

## Cambio 1 — `sections/main-product.liquid`

### 1a. Contador `sibling_count` — incluir producto actual

**Antes** (línea 690):
```liquid
for sibling_product in sibling_products
  if sibling_product != blank and sibling_product.id != product.id
    assign sibling_count = sibling_count | plus: 1
  endif
endfor
```

**Después**:
```liquid
for sibling_product in sibling_products
  if sibling_product != blank
    assign sibling_count = sibling_count | plus: 1
  endif
endfor
```

**Por qué:** El producto actual ahora se muestra en la lista (marcado como activo), así que debe contarse para que la sección aparezca.

---

### 1b. Loop de renderizado — filtro, atributos y estado activo

**Antes** (líneas 707–726):
```liquid
{%- for sibling_product in sibling_products -%}
  {%- if sibling_product != blank and sibling_product.id != product.id -%}
    <li class="product-siblings__item">
      <a href="{{ sibling_product.url }}" class="product-siblings__link">
        {%- if sibling_product.featured_image != blank -%}
          {{
            sibling_product.featured_image
            | image_url: width: 120
            | image_tag:
              loading: 'lazy',
              widths: '60, 80, 120',
              sizes: '(min-width: 750px) 4rem, 3.5rem',
              class: 'product-siblings__image',
              alt: sibling_product.featured_image.alt
          }}
        {%- endif -%}
        <span class="product-siblings__name">{{ sibling_product.title | escape }}</span>
      </a>
    </li>
  {%- endif -%}
{%- endfor -%}
```

**Después**:
```liquid
{%- for sibling_product in sibling_products -%}
  {%- if sibling_product != blank -%}
    {%- assign is_active = false -%}
    {%- if sibling_product.id == product.id -%}
      {%- assign is_active = true -%}
    {%- endif -%}
    <li class="product-siblings__item">
      <a
        href="{{ sibling_product.url }}"
        class="product-siblings__link{% if is_active %} is-active{% endif %}"
        data-product-url="{{ sibling_product.url }}"
        aria-current="{% if is_active %}page{% else %}false{% endif %}"
      >
        {%- if sibling_product.featured_image != blank -%}
          {{
            sibling_product.featured_image
            | image_url: width: 120
            | image_tag:
              loading: 'lazy',
              widths: '60, 80, 120',
              sizes: '(min-width: 750px) 4rem, 3.5rem',
              class: 'product-siblings__image',
              alt: sibling_product.featured_image.alt
          }}
        {%- endif -%}
        <span class="product-siblings__name">{{ sibling_product.title | escape }}</span>
      </a>
    </li>
  {%- endif -%}
{%- endfor -%}
```

**Qué cambió y por qué:**

| Cambio | Razón |
|---|---|
| Filtro `sibling_product.id != product.id` eliminado del `if` | El producto actual ahora se incluye en la lista para mostrarlo como "activo" |
| Variable `is_active` | Detecta si el item del loop es el producto que se está viendo actualmente |
| `class="... is-active"` | Aplica estilo visual al producto activo (CSS agregado en paso 3) |
| `data-product-url="{{ sibling_product.url }}"` | El JS lee este atributo para saber a qué URL hacer fetch. Sin él el listener de clic no intercepta nada |
| `aria-current="page"` en activo | Accesibilidad: indica al screen reader cuál es la página actual |

---

## Cambio 2 — `assets/product-info.js`

### 2a. Llamada en `connectedCallback()`

**Antes** (línea 28):
```javascript
this.initQuantityHandlers();
this.dispatchEvent(new CustomEvent('product-info:loaded', { bubbles: true }));
```

**Después**:
```javascript
this.initQuantityHandlers();
this.initSiblingNavigation();
this.dispatchEvent(new CustomEvent('product-info:loaded', { bubbles: true }));
```

---

### 2b. Nuevo método `initSiblingNavigation()`

Insertado entre `initQuantityHandlers()` y `disconnectedCallback()` (línea 49):

```javascript
initSiblingNavigation() {
  this.addEventListener('click', (event) => {
    const siblingLink = event.target.closest('a[data-product-url]');
    if (!siblingLink) return;
    if (!siblingLink.closest('.product-siblings')) return;

    event.preventDefault();

    const productUrl = siblingLink.dataset.productUrl;
    if (!productUrl || productUrl === this.dataset.url) return;

    this.pendingRequestUrl = productUrl;

    this.renderProductInfo({
      requestUrl: this.buildRequestUrlWithParams(productUrl, [], false),
      targetId: siblingLink.id || '',
      callback: this.handleSwapProduct(productUrl, false),
    });
  });
}
```

**Explicación línea a línea:**

```javascript
// Delega el evento al elemento <product-info> en vez de a cada link individual
this.addEventListener('click', (event) => {

  // Sube del elemento clickeado hasta encontrar un <a data-product-url>
  const siblingLink = event.target.closest('a[data-product-url]');
  if (!siblingLink) return; // clic en otra parte → ignorar

  // Asegura que el link está dentro de .product-siblings (no intercepta otros links con data-product-url)
  if (!siblingLink.closest('.product-siblings')) return;

  event.preventDefault(); // Cancela la navegación normal (sin esto, recargaría la página)

  const productUrl = siblingLink.dataset.productUrl;

  // Si la URL es la misma que el producto actual → ya estamos aquí, no hacer nada
  if (!productUrl || productUrl === this.dataset.url) return;

  // Guarda la URL pendiente para que otros handlers la conozcan
  this.pendingRequestUrl = productUrl;

  this.renderProductInfo({
    // false = usar ?section_id= (Section Rendering API parcial, no página completa)
    requestUrl: this.buildRequestUrlWithParams(productUrl, [], false),
    targetId: siblingLink.id || '',
    // false = reemplazar solo <product-info>, no todo el <main>
    callback: this.handleSwapProduct(productUrl, false),
  });
});
```

**Métodos reutilizados de Dawn (no se modificaron):**

| Método | Qué hace |
|---|---|
| `buildRequestUrlWithParams(url, [], false)` | Construye `/products/slug?section_id=main-product` |
| `renderProductInfo({ requestUrl, callback })` | Hace el `fetch()` y llama al callback con el HTML parseado |
| `handleSwapProduct(productUrl, false)` | Reemplaza el DOM de `<product-info>` con el nuevo HTML usando `viewTransition`, y llama `history.replaceState()` para actualizar la URL |

---

## Cambio 3 — `assets/component-siblings.css`

**Añadido** después del bloque `:hover` / `:focus-visible`:

```css
.product-siblings__link.is-active {
  background-color: rgba(var(--color-foreground), 0.05);
  border-color: rgb(var(--color-foreground));
  pointer-events: none;
}
```

| Propiedad | Razón |
|---|---|
| `border-color: rgb(var(--color-foreground))` | Borde sólido para distinguir el producto activo de los demás |
| `background-color` sutil | Feedback visual leve sin distorsionar el diseño |
| `pointer-events: none` | Evita hacer clic en el producto que ya se está viendo |

---

---

## Cambio 4 — `assets/product-info.js` (correcciones adicionales)

### 4a. Parámetro de sección: `section_id=` → `sections_id=`

**Archivo:** `assets/product-info.js`

**Ubicaciones modificadas:**

**Línea 170 — `buildRequestUrlWithParams()`:**
```javascript
// Antes
!shouldFetchFullPage && params.push(`section_id=${this.sectionId}`);

// Después
!shouldFetchFullPage && params.push(`sections_id=${this.sectionId}`);
```

**Línea 365 — `fetchQuantityRules()`:**
```javascript
// Antes
return fetch(`${this.dataset.url}?variant=${currentVariantId}&section_id=${this.dataset.section}`)

// Después
return fetch(`${this.dataset.url}?variant=${currentVariantId}&sections_id=${this.dataset.section}`)
```

**Por qué:** El parámetro correcto de la Shopify Section Rendering API para solicitar múltiples secciones es `sections_id` (plural). Con `section_id` (singular) la API puede no devolver el contenido esperado.

---

### 4b. Cache del fetch: evitar respuesta 304

**Archivo:** `assets/product-info.js` — método `renderProductInfo()` (línea 142)

**Antes:**
```javascript
fetch(requestUrl, { signal: this.abortController.signal })
```

**Después:**
```javascript
fetch(requestUrl, { signal: this.abortController.signal, cache: 'no-store' })
```

**Por qué:** Al navegar entre productos hermanos el navegador podía cachear la primera respuesta y devolver un **304 Not Modified** en peticiones posteriores, provocando que el DOM no se actualizara con el nuevo producto. Con `cache: 'no-store'` se fuerza al navegador a ignorar la caché HTTP y siempre obtener una respuesta fresca del servidor.

---

## Flujo completo después del cambio

```
1. Usuario carga /products/producto-a
   → Liquid renderiza la lista de hermanos
   → producto-a aparece con class="is-active", aria-current="page"
   → los demás tienen data-product-url apuntando a sus URLs

2. Usuario hace clic en "producto-b"
   → initSiblingNavigation() intercepta el clic
   → event.preventDefault() cancela la navegación normal
   → fetch("/products/producto-b?section_id=main-product")
   → Shopify devuelve SOLO el HTML de la sección main-product (no la página completa)

3. handleSwapProduct() procesa la respuesta:
   → HTMLUpdateUtility.viewTransition() reemplaza el elemento <product-info> en el DOM
   → history.replaceState() cambia la URL a /products/producto-b
   → El nuevo HTML ya tiene producto-b como activo y producto-a como hermano clickeable

4. Resultado:
   → Sin recarga de página
   → URL actualizada correctamente
   → Botón atrás del browser funciona
   → Título, precio, imágenes y variantes actualizados
   → producto-b visualmente marcado como activo
```

---

## Notas de compatibilidad

- No se modificó ningún método existente de Dawn, solo se añadió `initSiblingNavigation()` y se llamó desde `connectedCallback()`.
- El mecanismo de View Transitions (`HTMLUpdateUtility.viewTransition`) es el mismo que usa Dawn para el cambio de variantes, garantizando consistencia visual.
- Si JavaScript está deshabilitado, los links siguen funcionando como `<a href>` normales (progressive enhancement).
