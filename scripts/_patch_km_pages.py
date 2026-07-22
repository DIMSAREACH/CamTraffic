from pathlib import Path

path = Path(r'd:\Year4\Project Thesis\Expert System\Project\CamTraffic\frontend-user\shared\i18n\translations.ts')
text = path.read_text(encoding='utf-8')
start = text.find("    km: {")
first = text.find("allCategory:", start)
idx = text.find("allCategory:", first + 1)
if idx == -1:
    raise SystemExit('idx not found')
# back to line start
idx = text.rfind('\n', 0, idx) + 1
end = text.find("      users: {", idx)
if end == -1:
    raise SystemExit('end not found')
replacement = """        allCategory: '\u1791\u17b6\u17c6\u17a2\u179f\u17cb',
        signsUnit: '\u1795\u17d2\u179b\u17b6\u1780',
        description: '\u1780\u17b6\u179a\u1796\u17b7\u1796\u17b7\u17a2\u1793\u17d2\u1793\u17b6',
        trafficRules: '\u1785\u17d2\u1794\u17b6\u1794\u17cb\u1785\u17b1\u179a\u17b6\u1785\u179a',
        penalty: '\u1795\u17b6\u1780\u1796\u17b7\u1793\u17d0\u1799',
      },
      vehicles: {
        titleAdmin: '\u1782\u17d2\u179a\u17b6\u1794\u17cb\u1782\u17d2\u179a\u1784\u1799\u17b6\u1793\u1799\u1793\u17d2\u178f',
        titleDriver: '\u1799\u17b6\u1793\u1799\u1793\u17d2\u178f\u179a\u1794\u179f\u17cb\u1781\u17d2\u1789\u17bb\u17c6',
        subtitle: '\u1799\u17b6\u1793\u1799\u1793\u17d2\u178f\u179a\u17b6\u17a0\u17b6\u1794\u17cb\u1785\u17bb\u17c1\u17a2\u1788\u17d2\u1787\u17bc\u17b6\u179a\u17cb\u1780\u17d2\u1793\u17bb\u1784\u1794\u17d2\u179a\u1796\u17d0\u1793\u17d2\u1792',
        eyebrow: '\u1794\u17c6\u1789\u17d2\u1787\u17bc\u1799\u17b6\u1793\u1799\u1793\u17d2\u178f',
        heroSubtitleMany: '\u1799\u17b6\u1793\u1799\u1793\u17d2\u178f\u1785\u17bb\u17c1\u17a2\u1788\u17d2\u1787\u17bc\u17b6\u179a\u17cb {count}',
        heroSubtitleOne: '\u1799\u17b6\u1793\u1799\u1793\u17d2\u178f\u1785\u17bb\u17c1\u17a2\u1788\u17d2\u1787\u17bc\u17b6\u179a\u17cb \u17e1',
      },
      notifications: {
        title: '\u1780\u17b6\u179a\u1787\u17bc\u17d3\u178a\u17be\u17b6\u17a2\u17b6\u1799',
        subtitle: '\u1780\u17b6\u179a\u1787\u17bc\u17d3\u178a\u17be\u17b6\u17a2\u17b6\u1799 \u1793\u17b7\u1784\u179f\u17b6\u179a\u1794\u17d2\u179a\u1796\u17d0\u1793\u17d2\u1792',
        eyebrow: '\u1798\u17c1\u1787\u17b6\u1782\u17d2\u179a\u17b6\u1794\u17cb\u1780\u17b6\u179a\u1787\u17bc\u17d3\u178a\u17be\u17b6\u17a2\u17b6\u1799',
        unreadMany: '\u1798\u17b7\u1793\u1791\u17b6\u1793\u17cb\u17b6\u1793 {count}',
        unreadOne: '\u1798\u17b7\u1793\u1791\u17b6\u1793\u17cb\u17b6\u1793 \u17e1',
        allCaughtUp: '\u17b6\u1793\u17b6\u179f\u17cb\u17a0\u17be\u17c9\u1799!',
        markAllRead: '\u179f\u17c6\u1782\u17b6\u179b\u17cb\u1790\u17b6\u17b6\u17b6\u1793\u179a\u17c6\u17c1',
      },
"""
text = text[:idx] + replacement + text[end:]
path.write_text(text, encoding='utf-8')
print('patched km pages')
