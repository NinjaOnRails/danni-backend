module.exports = async (
  { source, title, description, startAt, tags, defaultVolume, duration },
  ctx,
  id = undefined
) => {
  // Prepare mutation input arguments
  const audioCreateInput = {
    source: source.trim(),
    title: title ? title.trim().substring(0, 99) : undefined,
    description: description ? description.trim().substring(0, 4999) : undefined,
    duration,
  };

  // startAt validation
  if (startAt) {
    if (isNaN(startAt) || startAt < 0) throw new Error('Invalid start at time');

    audioCreateInput.startAt = startAt;
  }

  // defaultVolume validation
  if (defaultVolume) {
    if (isNaN(defaultVolume) || defaultVolume > 100 || defaultVolume < 0)
      throw new Error('Invalid default volume level');
    audioCreateInput.defaultVolume = defaultVolume;
  }

  // tags validation
  if (tags) {
    // Split string into array of unique items
    tags = [...new Set(tags.split(' '))];

    // Remove tags
    const tagsDisconnect = [];
    if (id) {
      const connectedTags = await ctx.db.query.tags({
        where: { audio_some: { id } },
      });
      for (const key in connectedTags) {
        if (!tags.includes(connectedTags[key].text))
          tagsDisconnect.push({ text: connectedTags[key].text });
        tags = tags.filter(tag => tag !== connectedTags[key].text);
      }
    }

    // Divide tags into new and old (and to disconnect)
    const tagsConnect = [];
    const tagsCreate = [];
    for (const tag of tags) {
      // Check individual tag length
      if (tag.length > 63)
        throw new Error('Each tag must be under 63 characters long');
      // Query db for tag presence
      await ctx.db.query.tag({ where: { text: tag } }).then(res => {
        res
          ? tagsConnect.push({ text: res.text })
          : tagsCreate.push({ text: tag });
      });
    }

    // A tags to input arguments
    audioCreateInput.tags = {};
    if (tagsConnect.length) audioCreateInput.tags.connect = [...tagsConnect];
    if (tagsCreate.length) audioCreateInput.tags.create = [...tagsCreate];
    if (tagsDisconnect.length)
      audioCreateInput.tags.disconnect = [...tagsDisconnect];
  }

  return audioCreateInput;
};
