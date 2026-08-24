const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'ml_models', 'model.json');
let data = fs.readFileSync(filePath, 'utf8');

// The exported Keras model uses "batch_shape", but tfjs expects "batchInputShape"
if (data.includes('"batch_shape"')) {
    data = data.replace(/"batch_shape"/g, '"batchInputShape"');
    fs.writeFileSync(filePath, data);
    console.log("✅ model.json fixed successfully!");
} else {
    console.log("No 'batch_shape' found. Nothing to fix.");
}
