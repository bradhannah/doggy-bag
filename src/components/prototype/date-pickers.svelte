<script lang="ts">
  let date1 = $state('');
  let month1 = $state('');
  let selectedMonthYear = $state('2025');
  let selectedMonthMonth = $state(0);
  let selectedYear = $state('2025');
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const years = Array.from({ length: 10 }, (_, i) => 2025 + i);
</script>

<section class="variation-section">
  <h2>Date Picker Variations</h2>
  
  <div class="variations">
    <div class="variation">
      <h3>Variation 1: Native Date Input</h3>
      <div class="demo">
        <label>Date</label>
        <input type="date" bind:value={date1} />
        <small>Selected: {date1 || 'None'}</small>
      </div>
    </div>
    
    <div class="variation">
      <h3>Variation 2: Native Month Input</h3>
      <div class="demo">
        <label>Month</label>
        <input type="month" bind:value={month1} />
        <small>Selected: {month1 || 'None'}</small>
      </div>
    </div>
    
    <div class="variation">
      <h3>Variation 3: Custom Month Selector (Year + Dropdown)</h3>
      <div class="demo">
        <label>Month Selection</label>
        <div class="custom-month-selector">
          <input type="number" bind:value={selectedYear} min="1900" max="2100" />
          <select bind:value={selectedMonthMonth}>
            {#each months as month, i}
              <option value={i}>{month}</option>
            {/each}
          </select>
        </div>
        <small>Selected: {months[selectedMonthMonth]} {selectedYear}</small>
      </div>
    </div>
    
    <div class="variation">
      <h3>Variation 4: Custom Month Selector (Year + Side-by-Side)</h3>
      <div class="demo">
        <label>Month Selection</label>
        <div class="custom-month-selector-side">
          <div class="year-selector">
            <button on:click={() => selectedMonthYear = String(Number(selectedMonthYear) - 1)}>&lt;</button>
            <input type="number" bind:value={selectedMonthYear} min="1900" max="2100" />
            <button on:click={() => selectedMonthYear = String(Number(selectedMonthYear) + 1)}>&gt;</button>
          </div>
          <div class="month-grid">
            {#each months as month, i}
              <button 
                class:active={selectedMonthMonth === i}
                on:click={() => selectedMonthMonth = i}
              >
                {month.slice(0, 3)}
              </button>
            {/each}
          </div>
        </div>
        <small>Selected: {months[selectedMonthMonth]} {selectedMonthYear}</small>
      </div>
    </div>
  </div>
</section>

<style>
  .variation-section {
    padding: 1rem;
  }
  
  h2 {
    margin: 0 0 1.5rem 0;
    color: #1a1a1a;
  }
  
  .variations {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 2rem;
  }
  
  .variation {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1.5rem;
    background: #fff;
  }
  
  .variation h3 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    color: #333;
  }
  
  .demo {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  label {
    font-size: 0.9rem;
    font-weight: 500;
    color: #666;
  }
  
  input, select {
    padding: 0.75rem 1rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
  }
  
  input:focus, select:focus {
    outline: none;
    border-color: #24c8db;
    box-shadow: 0 0 0 2px rgba(36, 200, 219, 0.2);
  }
  
  .custom-month-selector {
    display: flex;
    gap: 0.5rem;
  }
  
  .custom-month-selector input {
    width: 100px;
  }
  
  .custom-month-selector-side {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .year-selector {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  
  .year-selector button {
    padding: 0.5rem 1rem;
    background: #f5f5f5;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .year-selector button:hover {
    background: #e0e0e0;
  }
  
  .year-selector input {
    width: 80px;
    text-align: center;
  }
  
  .month-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }
  
  .month-grid button {
    padding: 0.5rem;
    background: #f9f9f9;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
  }
  
  .month-grid button:hover {
    background: #f0f0f0;
  }
  
  .month-grid button.active {
    background: #24c8db;
    color: white;
    border-color: #24c8db;
  }
  
  small {
    color: #999;
    font-size: 0.85rem;
  }
</style>
