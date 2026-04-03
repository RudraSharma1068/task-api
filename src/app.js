const express = require('express');
const taskRoutes = require('./routes/tasks');

const app = express();
app.use(express.json());

app.use('/tasks', taskRoutes);

// Root route for Render
app.get('/', (req, res) => {
  res.send('Task API is running');
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Task API running on port ${PORT}`);
  });
}

module.exports = app;