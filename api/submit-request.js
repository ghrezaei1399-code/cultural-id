module.exports = async function handler(req, res) {
  try {
    return res.status(200).json({ 
      success: true, 
      analysis: {
        status: "approved",
        rejection_reason: null,
        cluster: "human",
        score_suggestion: 3,
        analysis_note: "تحلیل تست",
        guide_individual: "راهنمای فردی تست",
        guide_network: "راهنمای شبکه‌ای تست",
        guide_policy: "راهنمای سیاستی تست"
      }
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};
