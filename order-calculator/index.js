const express = require('express');
const app = express();
app.use(express.json());

// Single source of truth for prices. This table is hand-derived from
// restaurant_menu.xlsx / bikass_agent_system_prompt.md at the repo root.
// If the menu ever changes, this file, the xlsx, and the system prompt
// menu text all have to be updated together, or the agent will quote
// items/prices that this calculator doesn't recognize (or vice versa).
const PRICES = {
  "Beans": 1400,
  "Beef Sauce": 3500,
  "Banga Rice": 2500,
  "Basmati Rice": 2500,
  "Jollof Rice": 2000,
  "Yam": 800,
  "Yamarita": 2200,
  "Moimoi": 1600,
  "Dodo": 1000,
  "Catfish Peppersoup": 3000,
  "Porridge": 1500,
  "White Rice": 1900,
  "Unripe Plantain": 900,
  "Pepper Rice": 2500,
  "Egg Sauce": 1400,
  "Fish Sauce": 2700,
  "Assorted Peppersoup": 4200,
  "Fried Rice": 1800,
  "Stew": 1500,
  "Spaghetti": 1500,
  "Rice and Beans": 2200,
  "Coconut Rice": 2200,
  "Jollof Basmatti": 2500,
  "Garden Egg Sauce": 1700,
  "Pepper Rice and Beans": 2500,
  "Goatmeat Peppersoup": 4200,
  "Assorted": 1800,
  "Beef in Stew": 1400,
  "Big Chicken": 4800,
  "Big Croaker Fish": 12000,
  "Biggest Chicken": 5500,
  "Biggest Kpomo": 2000,
  "Boiled Egg": 600,
  "Chicken Feet": 1800,
  "Chicken Wings": 2000,
  "Cow Head": 5000,
  "Cow Leg": 5600,
  "Fish in Stew": 4700,
  "Fresh Fish Croaker": 6000,
  "Fried Beef": 1400,
  "Gizzard": 1500,
  "Goat Meat": 4200,
  "Isesea Fish": 2500,
  "Kpomo": 2000,
  "Kpomo in Stew": 2000,
  "Medium Croaker Fish": 9000,
  "Meluza Fish": 3000,
  "Snail": 3000,
  "Turkey in Stew": 6000,
  "Fried Turkey": 6000,
  "Amstel Malt": 1000,
  "Berry Blast": 2300,
  "Big Coke": 700,
  "Big Exotic": 2600,
  "Big Fanta": 700,
  "Big Hollandia": 2600,
  "Big Ice Tea": 2600,
  "Big Pulpy": 2300,
  "Big Sprite": 700,
  "Big Tigernut": 3500,
  "Big Wide Fire": 2500,
  "Black Bullet": 2700,
  "Blue Bullet": 2200,
  "Can Chivita": 1000,
  "Can Coke": 1200,
  "Can Exotic": 1000,
  "Can Fanta": 1200,
  "Can Fayrouz": 1200,
  "Can Ice Tea": 1000,
  "Can Sprite": 1000,
  "Chivita": 2600,
  "Desperados": 1200,
  "Double Black": 1800,
  "Guinness Malt": 1000,
  "Guinness Stout": 2000,
  "Heineken": 1200,
  "Hero": 1200,
  "Monster": 2000,
  "Nestle Water": 350,
  "Orange Juice": 3500,
  "Origin Bitter": 2500,
  "Pineapple Juice": 3500,
  "Power Horse": 2000,
  "Predator": 800,
  "Pure Heaven": 2500,
  "Action Bitters": 2500,
  "Pizza Roll": 2800,
  "Popcorn": 1600,
  "Fish Roll": 1700,
  "Fish Pie": 1600,
  "Meat Pie": 1600,
  "Hotdog": 1200,
  "Jam Doughnuts": 1100,
  "Plain Doughnut": 1000,
  "Jumbo Roll": 3000,
  "Sardine Bread": 2500,
  "Burger Bread": 1400,
  "Normal Bread": 1700,
  "Bole and Fish": 5000,
  "Cup Cake": 800,
  "Small Pizza": 12000,
  "Afang": 1400,
  "Banga and Catfish": 3200,
  "Banga Soup": 1200,
  "Black Soup": 1200,
  "Edekanikong": 1200,
  "Eforiro": 1200,
  "Egusi": 1200,
  "Ogbono Soup": 1200,
  "Oha Soup": 1200,
  "Okro and Assorted": 3200,
  "Okro and Fish": 3200,
  "Okro Soup": 1200,
  "Okro, Fish and Assorted": 4200,
  "Pondo": 700,
  "Starch": 700,
  "Eba": 700,
  "Wheat": 700,
  "Semo": 700,
  "Big Barbeque": 7000,
  "Big Celeb Cake": 30000,
  "Big Pizza": 17000,
  "Bole and Fish Large": 6000,
  "Celebration Cake": 10000,
  "Fruit Parfait": 5500,
  "Medium Barbeque": 6000,
  "Medium Pizza": 15000,
  "Milkshake": 5000,
  "Big Cake": 20000,
  "Biggest Cake": 25000,
  "Red Velvet Cake": 3500
};

// Converts a whole number of naira into Nigerian-style spoken words, e.g.
// 14450 -> "fourteen thousand, four hundred and fifty naira". Exists so the
// agent never has to convert digits to words itself — it kept lapsing into
// clipped Western-style reading ("4 8 0 0") despite prompt instructions.
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function threeDigitsToWords(n) {
  const parts = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} hundred`);
    n %= 100;
    if (n > 0) parts.push('and');
  }
  if (n >= 20) {
    const tens = TENS[Math.floor(n / 10)];
    const rem = n % 10;
    parts.push(rem > 0 ? `${tens}-${ONES[rem]}` : tens);
  } else if (n > 0) {
    parts.push(ONES[n]);
  }
  return parts.join(' ');
}

function numberToWords(num) {
  if (num === 0) return 'zero';
  const millions = Math.floor(num / 1e6);
  const thousands = Math.floor((num % 1e6) / 1e3);
  const remainder = num % 1000;

  const parts = [];
  if (millions) parts.push(`${threeDigitsToWords(millions)} million`);
  if (thousands) parts.push(`${threeDigitsToWords(thousands)} thousand`);
  if (remainder) parts.push(threeDigitsToWords(remainder));

  return parts.join(', ');
}

function totalToNairaWords(total) {
  return `${numberToWords(total)} naira`;
}

function calculateTotal(items) {
  let total = 0;
  const lineItems = [];
  const unknown = [];

  for (const { name, quantity } of items) {
    const price = PRICES[name];
    if (price === undefined) {
      unknown.push(name);
      continue;
    }
    const qty = Number(quantity) || 0;
    const subtotal = price * qty;
    total += subtotal;
    lineItems.push({ name, quantity: qty, price, subtotal });
  }

  return { total, lineItems, unknown };
}

// Vapi's real tool-call payload shape has varied in practice between
// { id, arguments } and { id, function: { arguments } } depending on the
// model provider. This crashed in production (TypeError: Cannot read
// properties of undefined (reading 'items')) because only the flat shape
// was handled. Logging the raw body so any future shape change shows up
// in Render logs instead of a silent 500.
app.post('/calculate-total', (req, res) => {
  console.log('calculate-total request body:', JSON.stringify(req.body));

  const toolCalls = req.body.message?.toolCallList || [];

  const results = toolCalls.map((call) => {
    const rawArgs = call.arguments ?? call.function?.arguments;

    let args;
    try {
      args = typeof rawArgs === 'string' ? JSON.parse(rawArgs) : rawArgs;
    } catch (e) {
      return { toolCallId: call.id, result: `Error: could not parse tool arguments (${e.message}).` };
    }

    if (!args || !Array.isArray(args.items)) {
      return { toolCallId: call.id, result: 'Error: no items array received in tool call.' };
    }

    const { total, lineItems, unknown } = calculateTotal(args.items);

    if (unknown.length > 0) {
      return {
        toolCallId: call.id,
        result: `Error: these items are not on the menu: ${unknown.join(', ')}. Ask the caller to clarify before continuing.`,
      };
    }

    return {
      toolCallId: call.id,
      result: JSON.stringify({ total, totalWords: totalToNairaWords(total), lineItems }),
    };
  });

  res.json({ results });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`order-calculator listening on ${PORT}`));
