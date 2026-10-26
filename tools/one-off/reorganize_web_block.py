from pathlib import Path
r=Path(r'D:\AI\health-android')
p=r/'app/src/main/assets/app.js'; s=p.read_text(encoding='utf-8')

start='  // Fetched page text is kept locally and only attached to the question the user sends.\n'
assert s.count(start)==1, 'web block start not found'
end='  async function sendChat() {'
assert s.count(end)==1
i=s.index(start); j=s.index(end)
block=s[i:j]
s=s[:i]+s[j:]

# Keep only the state declaration inside the chat-send region; the DOM wiring moves after sendChat.
decl='  // Fetched page text is kept locally and only attached to the question the user sends.\n  let webSource = null;\n'
rest=block.replace(decl,'')
assert rest.strip(), 'handler block would be empty'
assert 'renderWebSource' in rest and '$(\'#chat-fetch\')' in rest

s=s.replace(end, decl+end, 1)
anchor='  async function savePush(form) {'
assert s.count(anchor)==1, 'savePush anchor not found'
s=s.replace(anchor, rest.rstrip('\n')+'\n'+anchor, 1)
p.write_text(s,encoding='utf-8')
print('moved web reference wiring after sendChat; state declaration kept with chat state')
