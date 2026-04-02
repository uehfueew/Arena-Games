// boardData.js
// Holds the 40 spaces of the Monopoly board
// Standard layout starting at bottom-right (Go) and going clockwise.

const boardData = [
    { id: 0, name: "GO", type: "go", price: 0, rent: 0, color: null, class: "space go corner" },
    { id: 1, name: "Mediterranean Avenue", type: "property", price: 60, rent: 2, color: "#8b4513", class: "space bottom-row" },
    { id: 2, name: "Community Chest", type: "chest", price: 0, rent: 0, color: null, class: "space bottom-row" },
    { id: 3, name: "Baltic Avenue", type: "property", price: 60, rent: 4, color: "#8b4513", class: "space bottom-row" },
    { id: 4, name: "Income Tax", type: "tax", price: 200, rent: 0, color: null, class: "space bottom-row" },
    { id: 5, name: "Reading Railroad", type: "railroad", price: 200, rent: 25, color: "#111", class: "space bottom-row" },
    { id: 6, name: "Oriental Avenue", type: "property", price: 100, rent: 6, color: "#87ceeb", class: "space bottom-row" },
    { id: 7, name: "Chance", type: "chance", price: 0, rent: 0, color: null, class: "space bottom-row" },
    { id: 8, name: "Vermont Avenue", type: "property", price: 100, rent: 6, color: "#87ceeb", class: "space bottom-row" },
    { id: 9, name: "Connecticut Avenue", type: "property", price: 120, rent: 8, color: "#87ceeb", class: "space bottom-row" },
    { id: 10, name: "IN JAIL", type: "jail", price: 0, rent: 0, color: null, class: "space jail corner" },
    { id: 11, name: "St. Charles Place", type: "property", price: 140, rent: 10, color: "#ff0080", class: "space left-col" },
    { id: 12, name: "Electric Company", type: "utility", price: 150, rent: 0, color: "#bda203", class: "space left-col" },
    { id: 13, name: "States Avenue", type: "property", price: 140, rent: 10, color: "#ff0080", class: "space left-col" },
    { id: 14, name: "Virginia Avenue", type: "property", price: 160, rent: 12, color: "#ff0080", class: "space left-col" },
    { id: 15, name: "Pennsylvania Railroad", type: "railroad", price: 200, rent: 25, color: "#111", class: "space left-col" },
    { id: 16, name: "St. James Place", type: "property", price: 180, rent: 14, color: "#ffa500", class: "space left-col" },
    { id: 17, name: "Community Chest", type: "chest", price: 0, rent: 0, color: null, class: "space left-col" },
    { id: 18, name: "Tennessee Avenue", type: "property", price: 180, rent: 14, color: "#ffa500", class: "space left-col" },
    { id: 19, name: "New York Avenue", type: "property", price: 200, rent: 16, color: "#ffa500", class: "space left-col" },
    { id: 20, name: "FREE PARKING", type: "parking", price: 0, rent: 0, color: null, class: "space parking corner" },
    { id: 21, name: "Kentucky Avenue", type: "property", price: 220, rent: 18, color: "#ff0000", class: "space top-row" },
    { id: 22, name: "Chance", type: "chance", price: 0, rent: 0, color: null, class: "space top-row" },
    { id: 23, name: "Indiana Avenue", type: "property", price: 220, rent: 18, color: "#ff0000", class: "space top-row" },
    { id: 24, name: "Illinois Avenue", type: "property", price: 240, rent: 20, color: "#ff0000", class: "space top-row" },
    { id: 25, name: "B. & O. Railroad", type: "railroad", price: 200, rent: 25, color: "#111", class: "space top-row" },
    { id: 26, name: "Atlantic Avenue", type: "property", price: 260, rent: 22, color: "#ffff00", class: "space top-row" },
    { id: 27, name: "Ventnor Avenue", type: "property", price: 260, rent: 22, color: "#ffff00", class: "space top-row" },
    { id: 28, name: "Water Works", type: "utility", price: 150, rent: 0, color: "#bda203", class: "space top-row" },
    { id: 29, name: "Marvin Gardens", type: "property", price: 280, rent: 24, color: "#ffff00", class: "space top-row" },
    { id: 30, name: "GO TO JAIL", type: "goto-jail", price: 0, rent: 0, color: null, class: "space goto-jail corner" },
    { id: 31, name: "Pacific Avenue", type: "property", price: 300, rent: 26, color: "#008000", class: "space right-col" },
    { id: 32, name: "North Carolina Avenue", type: "property", price: 300, rent: 26, color: "#008000", class: "space right-col" },
    { id: 33, name: "Community Chest", type: "chest", price: 0, rent: 0, color: null, class: "space right-col" },
    { id: 34, name: "Pennsylvania Avenue", type: "property", price: 320, rent: 28, color: "#008000", class: "space right-col" },
    { id: 35, name: "Short Line", type: "railroad", price: 200, rent: 25, color: "#111", class: "space right-col" },
    { id: 36, name: "Chance", type: "chance", price: 0, rent: 0, color: null, class: "space right-col" },
    { id: 37, name: "Park Place", type: "property", price: 350, rent: 35, color: "#0000ff", class: "space right-col" },
    { id: 38, name: "Luxury Tax", type: "tax", price: 100, rent: 0, color: null, class: "space right-col" },
    { id: 39, name: "Boardwalk", type: "property", price: 400, rent: 50, color: "#0000ff", class: "space right-col" }
];

window.boardData = boardData;