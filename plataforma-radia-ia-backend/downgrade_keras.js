const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'ml_models', 'model.json');
let model = JSON.parse(fs.readFileSync(filePath, 'utf8'));

let count = 0;

function downgradeInboundNodes(layer) {
    if (!layer.inbound_nodes || layer.inbound_nodes.length === 0) return;
    
    // Check if it's already Keras 2 format
    if (Array.isArray(layer.inbound_nodes[0]) && Array.isArray(layer.inbound_nodes[0][0])) return;

    let new_inbound_nodes = [];
    
    for (let i = 0; i < layer.inbound_nodes.length; i++) {
        let node = layer.inbound_nodes[i];
        let args = node.args || [];
        let kwargs = node.kwargs || {};
        
        let new_node = [];
        
        if (args.length > 0) {
            let input_arg = args[0];
            
            // Si es un array (ej. capa Add con multiples entradas)
            if (Array.isArray(input_arg)) {
                for (let j = 0; j < input_arg.length; j++) {
                    let tensor = input_arg[j];
                    if (tensor.class_name === '__keras_tensor__' && tensor.config && tensor.config.keras_history) {
                        let hist = tensor.config.keras_history; // [node_name, node_index, tensor_index]
                        new_node.push([hist[0], hist[1], hist[2], kwargs]);
                    }
                }
            } else {
                // Entrada simple
                if (input_arg.class_name === '__keras_tensor__' && input_arg.config && input_arg.config.keras_history) {
                    let hist = input_arg.config.keras_history;
                    new_node.push([hist[0], hist[1], hist[2], kwargs]);
                }
            }
        }
        
        if (new_node.length > 0) {
            new_inbound_nodes.push(new_node);
        }
    }
    
    if (new_inbound_nodes.length > 0) {
        layer.inbound_nodes = new_inbound_nodes;
        count++;
    }
}

const topology = model.modelTopology;
if (topology && topology.model_config && topology.model_config.config && topology.model_config.config.layers) {
    let layers = topology.model_config.config.layers;
    for (let layer of layers) {
        downgradeInboundNodes(layer);
    }
}

// Ensure the outer model also is properly formed
// The converter sometimes outputs an empty object for `config` at the root
if (topology.keras_version === '3.10.0') {
     topology.keras_version = '2.12.0'; // spoof Keras 2
}

fs.writeFileSync(filePath, JSON.stringify(model, null, 2));
console.log(`✅ model.json arreglado! Se corrigieron ${count} capas de formato Keras 3 a Keras 2.`);
