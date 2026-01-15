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

        // --- 新增：計算倒敘後的期數 ---
        const sortedWeeklyKeys = computed(() => {
            return Object.keys(weeklyData.value).sort((a, b) => Number(b) - Number(a));
        });

        // 初始化
        partConfigs.forEach(conf => {
            parts.value[conf.key] = {
                label: conf.label,
                options: {}, search: '', selectedKey: '', isOpen: false
            };
        });

        const fetchData = async () => {
            const partRequests = partConfigs.map(conf => 
                axios.get(`./assets/datas/${conf.key}.json`)
                    .then(res => ({ key: conf.key, data: res.data }))
                    .catch(() => ({ key: conf.key, data: {} }))
            );
            const weeklyRequest = axios.get('./assets/datas/weekly.json')
                .then(res => weeklyData.value = res.data)
                .catch(() => console.error("無法讀取 weekly.json"));

            const results = await Promise.all([...partRequests, weeklyRequest]);
            results.forEach(res => {
                if (res && res.key) parts.value[res.key].options = res.data;
            });
        };

        const applyWeekly = () => {
            if (!selectedWeeklyKey.value) return;
            const weekInfo = weeklyData.value[selectedWeeklyKey.value];
            Object.keys(labelToKeyMap).forEach(label => {
                const targetKey = labelToKeyMap[label];
                const keyword = weekInfo[label];
                parts.value[targetKey].search = keyword || '';
                parts.value[targetKey].selectedKey = keyword || '';
            });
        };

        const filteredOptions = (partKey) => {
            const part = parts.value[partKey];
            if (!part.search) return part.options;
            const searchLower = part.search.toLowerCase();
            const res = {};
            Object.keys(part.options).forEach(k => {
                if (k.toLowerCase().includes(searchLower)) res[k] = part.options[k];
            });
            return res;
        };

        const selectItem = (partKey, itemKey) => {
            parts.value[partKey].selectedKey = itemKey;
            parts.value[partKey].search = itemKey;
            parts.value[partKey].isOpen = false;
        };

        const clearSingle = (partKey) => {
            parts.value[partKey].search = '';
            parts.value[partKey].selectedKey = '';
        };

        const clearAll = () => {
            if (confirm('確定要清除所有已選配裝嗎？')) {
                selectedWeeklyKey.value = "";
                partConfigs.forEach(conf => clearSingle(conf.key));
            }
        };

        onMounted(() => { fetchData(); });

        return {
            parts, partConfigs, weeklyData, selectedWeeklyKey, sortedWeeklyKeys,
            filteredOptions, selectItem, clearSingle, clearAll, applyWeekly
        };
    }
}).mount('#app');