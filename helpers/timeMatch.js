module.exports = function extractDateAndTime(text) {
    const dateTimeRegex = /\b(?:(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?)(?:\s+(?:at|@)\s+(\d{1,2})(?::(\d{1,2}))?\s*([ap]\.?m\.?|[AP]\.?M\.?))?\b/g;
    
    const matches = [];
    let match;
    
    while ((match = dateTimeRegex.exec(text)) !== null) {
      matches.push({
        fullMatch: match[0],
        date: `${match[1]} ${match[2]}${match[2] ? getOrdinalSuffix(parseInt(match[2])) : ''}`,
        time: match[3] ? `${match[3]}${match[4] ? ':' + match[4] : ''}${match[5] ? ' ' + match[5] : ''}` : null
      });
    }
    
    return matches[0];
  }
  
  function getOrdinalSuffix(day) {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }
  