module.exports = async function handler(req, res) {
  return res.status(200).json({ 
    success: true, 
    message: 'get-request-by-tracking is working',
    query: req.query,
    method: req.method
  });
};
