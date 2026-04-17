const { createApp, ref, computed, onMounted } = Vue;

createApp({
    setup() {
        const partConfigs = [
            { label: '頭部', key: 'head' },
            { label: '身體', key: 'body' },
            { label: '手部', key: 'hands' },
            { label: '腿部', key: 'leg' },
            { label: '腳部', key: 'feets' },
            { label: '耳墜', key: 'ears' },
            { label: '項環', key: 'necklace' },
            { label: '手飾', key: 'bracelet' },
            { label: '戒指(右)', key: 'rings_right' },
            { label: '戒指(左)', key: 'rings_left' }
        ];

        const labelToKeyMap = {
            "頭部": "head", "身體": "body", "手部": "hands", "腿部": "leg", "腳部": "feets",
            "耳墜": "ears", "項環": "necklace", "手飾": "bracelet", "戒指(右)": "rings_right", "戒指(左)": "rings_left"
        };

        const parts = ref({});
        const weeklyData = ref({});
        const selectedWeeklyKey = ref("");
        // 全域搜尋變數，裝備反向搜尋用
        const globalSearch = ref("");
        // 依期數排序的 keys 陣列
        const sortedWeeklyKeys = computed(() => {
            return Object.keys(weeklyData.value).sort((a, b) => Number(b) - Number(a));
        });

        // 初始化
        partConfigs.forEach(conf => {
            parts.value[conf.key] = {
                label: conf.label,
                options: {}, 
                search: '', 
                selectedKey: '', 
                isOpen: false
            };
        });

        // 自動計算期數
        const getAutoWeekKey = () => {
            const baseDate = new Date('2026-01-14T00:00:00'); // 第 416 期起始日
            const baseWeek = 416;
            const now = new Date();
            
            const diffInMs = now - baseDate;
            const diffInWeeks = Math.floor(diffInMs / (7 * 24 * 60 * 60 * 1000));
            
            return (baseWeek + diffInWeeks).toString();
        };

        // 讀取各部位詞條資料與 weekly.json
        const fetchData = async () => {
            try {
                const partRequests = partConfigs.map(conf => 
                    axios.get(`./assets/datas/${conf.key}.json`)
                        .then(res => ({ key: conf.key, data: res.data }))
                        .catch(() => ({ key: conf.key, data: {} }))
                );

                // 抓取每週主題資料
                const weeklyRes = await axios.get('./assets/datas/weekly.json');
                weeklyData.value = weeklyRes.data;

                const results = await Promise.all(partRequests);
                results.forEach(res => {
                    if (res && res.key) parts.value[res.key].options = res.data;
                });

                // 自動帶入期數
                const targetWeek = getAutoWeekKey();
                
                // 檢查 weekly.json 是否已經有這一期的資料
                if (weeklyData.value[targetWeek]) {
                    selectedWeeklyKey.value = targetWeek;
                } else {
                    // 如果計算出的期數還沒更新，則取現有資料中最新的一期
                    selectedWeeklyKey.value = sortedWeeklyKeys.value[0] || "";
                }
                
                if (selectedWeeklyKey.value) {
                    applyWeekly();
                }

            } catch (err) {
                console.error("資料讀取失敗:", err);
            }
        };

        // 套用對應期數的詞條
        const applyWeekly = () => {
            if (!selectedWeeklyKey.value) {
                return;
            }
            const weekInfo = weeklyData.value[selectedWeeklyKey.value];
            Object.keys(labelToKeyMap).forEach(label => {
                const targetKey = labelToKeyMap[label];
                const keyword = weekInfo[label];
                parts.value[targetKey].search = keyword || '';
                parts.value[targetKey].selectedKey = keyword || '';
            });
        };


        const buildSearchUrl = (itemName) => {
            const BASE = 'https://cycleapple.github.io/ffxiv-item-search-tc';

            let cleaned = itemName
                // 去除全形／半形括號內的補充說明，例如(複製品)
                .replace(/[（(][^）)]*[）)]/g, '')
                // 去除【】內的說明，例如【男/女】【鋼】
                .replace(/【[^】]*】/g, '')
                // 去除 ※ 開頭的備注（整行）
                .replace(/※.*/, '')
                .trim();

            if (!cleaned) return null;

            // 以 XX/xx/X/x 萬用字元及 / 斜線切割，取出所有有意義的關鍵字
            const keywords = cleaned
                .split(/[Xx]{1,2}|\//)
                .map(p => p.trim())
                .filter(Boolean);

            if (!keywords.length) return null;

            return `${BASE}?q=${keywords.join('+')}`;
        };

        // ─────────────────────────────────────────────
        // 將多行裝備文字轉成帶超連結的 HTML 字串
        //   每一行裝備名稱包裹成 <a> 連結
        //   ※ 開頭的備注行保留為純文字灰字
        // ─────────────────────────────────────────────
        const buildItemLinks = (text, partLabel) => {
            if (!text) return '';
        
            // 建立分類與 ID 的對應表 (根據您的需求)
            const catMap = {
                '頭部': '34',
                '身體': '35',
                '腿部': '36',
                '手部': '37',
                '腳部': '38',
                '項環': '40', // 對應項鍊
                '耳墜': '41', // 對應耳飾
                '手飾': '42', // 對應手鐲
                '戒指(右)': '43',
                '戒指(左)': '43'
            };
        
            // 根據傳入的 label 取得 cat 參數
            const catParam = catMap[partLabel] ? `&cat=${catMap[partLabel]}` : '';
        
            return text.split('\n').map(line => {
                const trimmed = line.trim();
                if (!trimmed) return '';
        
                // ※ 備注行，不加連結
                if (trimmed.startsWith('※')) {
                    return `<span class="block text-[11px] text-[#666677] mt-1">${escapeHtml(trimmed)}</span>`;
                }
        
                // 取得基礎 URL 並加上分類參數
                let url = buildSearchUrl(trimmed);
                if (url && catParam) {
                    url += catParam;
                }
        
                if (url) {
                    return `<a href="${url}" target="_blank" rel="noopener noreferrer"
                        class="block py-0.5 text-[#c8d8e8] hover:text-[#4db6ac] hover:underline underline-offset-2 transition-colors duration-150 leading-snug"
                    >${escapeHtml(trimmed)}</a>`;
                }
        
                // 無法產生連結時退回純文字
                return `<span class="block py-0.5 leading-snug">${escapeHtml(trimmed)}</span>`;
            }).join('');
        };

        // XSS 防護用的簡易 HTML 跳脫
        const escapeHtml = (str) => {
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        };

        // 各部位全域搜尋
        const globalMatchedResults = (partKey) => {
            const query = globalSearch.value.trim().toLowerCase();
            if (!query) {
                return [];
            }
            
            const options = parts.value[partKey].options;
            const matched = [];

            Object.entries(options).forEach(([k, v]) => {
                // 將描述字串按\n切成陣列
                const lines = v.split('\n');
                
                // 只保留包含搜尋字串的行
                const filteredLines = lines.filter(line => 
                    line.toLowerCase().includes(query)
                );

                if (filteredLines.length > 0 ) {
                    matched.push({ 
                        key: k, 
                        value: filteredLines.length > 0 ? filteredLines.join('\n') : v 
                    });
                }
            });
            return matched;
        };

        // 各部位選單內搜尋
        const filteredOptions = (partKey) => {
            const part = parts.value[partKey];
            if (!part.search) {
                return part.options;
            }
            const searchLower = part.search.toLowerCase();
            const res = {};
            Object.keys(part.options).forEach(k => {
                if (k.toLowerCase().includes(searchLower)) res[k] = part.options[k];
            });
            return res;
        };

        // 選擇某個詞條
        const selectItem = (partKey, itemKey) => {
            parts.value[partKey].selectedKey = itemKey;
            parts.value[partKey].search = itemKey;
            parts.value[partKey].isOpen = false;
        };

        // 清除某個部位的選擇
        const clearSingle = (partKey) => {
            parts.value[partKey].search = '';
            parts.value[partKey].selectedKey = '';
        };

        // 清除所有詞條
        const clearAll = () => {
            selectedWeeklyKey.value = "";
            globalSearch.value = ""; // 清除全域搜尋
            partConfigs.forEach(conf => clearSingle(conf.key));
        };

        onMounted(() => { fetchData(); });

        return {
            parts, partConfigs, weeklyData, selectedWeeklyKey, sortedWeeklyKeys,
            globalSearch, globalMatchedResults,
            filteredOptions, selectItem, clearSingle, clearAll, applyWeekly,
            buildItemLinks   // ← 暴露給模板使用
        };
    }
}).mount('#app');
