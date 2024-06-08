const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());

// Verbinden Sie sich mit der MongoDB-Datenbank
mongoose.connect('mongodb://localhost:27017/markers', { useNewUrlParser: true, useUnifiedTopology: true });

const markerSchema = new mongoose.Schema({
    latlng: { type: [Number], required: true },
    name: String,
    zone: String,
    epon: String,
    streetviewLink: String,
    linien: Array,
    fragen: Array
});

const Marker = mongoose.model('Marker', markerSchema);

// Endpunkte erstellen
app.get('/api/markers', async (req, res) => {
    const markers = await Marker.find();
    res.json(markers);
});

app.post('/api/markers', async (req, res) => {
    const marker = new Marker(req.body);
    await marker.save();
    res.json(marker);
});

app.delete('/api/markers/:id', async (req, res) => {
    await Marker.findByIdAndDelete(req.params.id);
    res.json({ message: 'Marker deleted' });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
