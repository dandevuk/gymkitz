// assets/product-custom-property.js
import { Component } from '@theme/component';
import { ThemeEvents } from '@theme/events';
import { morph } from '@theme/morph';

// Shopify's hard limit for a file uploaded as a line item property.
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

/**
 * @typedef {object} ProductCustomPropertyRefs
 * @property {HTMLInputElement | HTMLTextAreaElement} textInput - The text input.
 * @property {HTMLElement} characterCount - The character count element.
 * @property {HTMLInputElement} fileInput - The file upload input.
 */

/**
 * A custom element that manages product custom properties.
 * When the block is set to only show for variants with personalisation, this component
 * listens for variant update events and re-renders itself using the freshly fetched
 * section HTML, since a variant change on the product page only morphs the variant
 * picker itself - not the rest of the section.
 * @extends Component<ProductCustomPropertyRefs>
 */
class ProductCustomProperty extends Component {
  connectedCallback() {
    super.connectedCallback();
    this.#section?.addEventListener(ThemeEvents.variantUpdate, this.#handleVariantUpdate);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#section?.removeEventListener(ThemeEvents.variantUpdate, this.#handleVariantUpdate);
  }

  get #section() {
    return this.closest('.shopify-section, dialog');
  }

  handleInput() {
    this.#updateCharacterCount();
  }

  #updateCharacterCount() {
    const { characterCount, textInput } = this.refs;
    const currentLength = textInput.value.length;
    const maxLength = textInput.maxLength;

    const template = characterCount.getAttribute('data-template');
    if (!template) return;

    const updatedText = template.replace('[current]', currentLength.toString()).replace('[max]', maxLength.toString());

    characterCount.textContent = updatedText;
  }

  /**
   * Validates the selected file against Shopify's max upload size, catching an oversized
   * file client-side rather than waiting for the add-to-cart request to be rejected.
   * @param {Event & {target: HTMLInputElement}} event - The file input's change event.
   */
  handleFileChange(event) {
    const input = event.target;
    const file = input.files?.[0];

    if (file && file.size > MAX_FILE_SIZE_BYTES) {
      input.setCustomValidity(input.dataset.maxFileSizeError || 'File is too large.');
    } else {
      input.setCustomValidity('');
    }

    input.reportValidity();
  }

  /**
   * Re-renders the block for the newly selected variant.
   * @param {import('@theme/events').VariantUpdateEvent} event - The variant update event.
   */
  #handleVariantUpdate = (event) => {
    if (event.detail.data.newProduct) {
      this.dataset.productId = event.detail.data.newProduct.id;
    } else if (event.target instanceof HTMLElement && event.target.dataset.productId !== this.dataset.productId) {
      return;
    }

    const newBlock = event.detail.data.html.querySelector(
      `product-custom-property-component[data-block-id="${this.dataset.blockId}"]`
    );

    if (!(newBlock instanceof HTMLElement)) return;

    this.hidden = newBlock.hidden;
    morph(this, newBlock, { childrenOnly: true });
  };
}

customElements.define('product-custom-property-component', ProductCustomProperty);
