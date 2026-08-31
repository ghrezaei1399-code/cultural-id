module.exports = async function handler(req, res) {
  return res.status(200).json({ 
    success: true, 
    message: 'submit-request is working',
    method: req.method,
    body: req.body 
  });
};
