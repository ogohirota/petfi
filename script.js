// ===============================================================
//         ふえる喜び！シミュレーター
//         script.js (v2.4 - SSS計算ロジック修正)
// ===============================================================

// --- グローバル変数と設定 ---
let userSelections = { dogSize: null, breedName: null, annualRate: null, planName: null, initialInvestment: null, monthlyInvestment: null };
let dogSimState = { dogs: [], currentYear: 0, timer: null, isStatisticalMode: false };

// 画面間で値を引き継ぐための共有ステート
let sharedState = {
    monthlyCostYen: 0,      // 単位: 円
    requiredInvestment: 0,  // 単位: 万円
    petfiDogSize: 'small'   // PetFi計算用の犬のサイズ
};

const breeds = {
    large: ['アイリッシュ・ウルフハウンド', 'アイリッシュ・セッター', '秋田犬', 'アフガン・ハウンド', 'アラスカン・マラミュート', 'イングリッシュ・セッター', 'イングリッシュ・ポインター', 'オールド・イングリッシュ・シープドッグ', 'グレート・デーン', 'グレート・ピレニーズ', 'グレーハウンド', 'ゴールデン・レトリーバー', 'コリー', 'シベリアン・ハスキー', 'スタンダード・プードル', 'ドーベルマン', 'バーニーズ・マウンテン・ドッグ', 'ラブラドール・レトリーバー', 'ミックス犬（大）'],
    medium: ['アメリカン・コッカー・スパニエル', 'ウィペット', 'ウェルシュ・コーギー・ペンブローク', 'エアデール・テリア', 'オーストラリアン・シェパード', '甲斐犬', '紀州犬', '柴犬（豆柴含む）', 'チャウチャウ', '日本スピッツ', 'ビーグル', 'フレンチ・ブルドッグ', 'ブルドッグ', 'ボーダー・コリー', '北海道犬', 'ワイヤー・フォックス・テリア', 'ミックス犬（中）'],
    small: ['イタリアン・グレーハウンド', 'ウェルシュ・テリア', 'ウエスト・ハイランド・ホワイト・テリア', 'カニーンヘン・ダックスフンド', 'キャバリア・キング・チャールズ・スパニエル', 'シー・ズー', 'シェットランド・シープドッグ', 'ジャック・ラッセル・テリア', 'チワワ', '狆（ちん）', 'トイ・プードル', 'パグ', 'パピヨン', 'ビション・フリーゼ', 'ペキニーズ', 'ボストン・テリア', 'ポメラニアン', 'マルチーズ', 'ミニチュア・シュナウザー', 'ミニチュア・ダックスフンド', 'ミニチュア・ピンシャー', 'ヨークシャー・テリア', 'ミックス犬（小）']
};

const dogParams = {
    small:  { meanPups: 3, stdPups: 1, minAge: 2.0, maxAge: 5.5, lifeExpectancy: 14, declineStartAge: 12 },
    medium: { meanPups: 5, stdPups: 1.5, minAge: 2.5, maxAge: 5.0, lifeExpectancy: 12, declineStartAge: 10 },
    large:  { meanPups: 8, stdPups: 2, minAge: 2.5, maxAge: 5.0, lifeExpectancy: 10, declineStartAge: 8  }
};

// --- イベントリスナーの初期化 ---
function initializeEventListeners() {
    // メインシミュレーター関連
    document.getElementById('btn-size-small').addEventListener('click', () => showBreedSelection('small'));
    document.getElementById('btn-size-medium').addEventListener('click', () => showBreedSelection('medium'));
    document.getElementById('btn-size-large').addEventListener('click', () => showBreedSelection('large'));
    document.getElementById('btn-plan-kotsu').addEventListener('click', () => selectPlan('kotsu'));
    document.getElementById('btn-plan-waku').addEventListener('click', () => selectPlan('waku'));
    document.getElementById('btn-calculate').addEventListener('click', runAllSimulations);
    
    // ページ遷移関連
    document.getElementById('btn-start-simulation').addEventListener('click', () => showScreen('selection-screen'));
    document.querySelectorAll('.feature-button').forEach(button => {
        button.addEventListener('click', (event) => {
            const targetScreen = event.currentTarget.dataset.targetScreen;
            if (targetScreen) {
                if (targetScreen === 'savings-simulator-screen') {
                    showScreen(targetScreen, 0); // TOPから来た場合は0を渡す
                } else {
                    showScreen(targetScreen);
                }
            }
        });
    });
    document.getElementById('btn-back-to-start').addEventListener('click', () => showScreen('selection-screen'));
    document.getElementById('btn-back-to-plan').addEventListener('click', () => showScreen('plan-selection-screen'));
    document.getElementById('btn-back-to-home-from-selection').addEventListener('click', () => showScreen('home-page-screen'));
    document.getElementById('btn-goto-lifetime-cost').addEventListener('click', () => showScreen('lifetime-cost-screen'));
    document.getElementById('btn-back-to-main-from-lcs').addEventListener('click', () => showScreen('home-page-screen'));
    document.getElementById('btn-goto-sss-from-lcs').addEventListener('click', () => {
        const targetAmount = lcsState.selectedPlan === 'normal' ? lcsState.normalCost : lcsState.totalCost;
        showScreen('savings-simulator-screen', targetAmount);
    });
    document.getElementById('btn-goto-petfi-from-lcs').addEventListener('click', () => {
        // PetFiモーダル表示前に、選択されたプランに基づいて共有ステートを更新
        updateLcsAndSharedState(); 
        document.getElementById('petfi-awareness-modal').classList.remove('hidden');
        document.getElementById('petfi-awareness-modal').classList.add('visible');
    });

    document.getElementById('btn-proceed-to-petfi').addEventListener('click', () => {
        document.getElementById('petfi-awareness-modal').classList.add('hidden');
        document.getElementById('petfi-awareness-modal').classList.remove('visible');
        showScreen('petfi-screen');
    });
    document.getElementById('btn-close-petfi-awareness-modal').addEventListener('click', () => {
        document.getElementById('petfi-awareness-modal').classList.add('hidden');
        document.getElementById('petfi-awareness-modal').classList.remove('visible');
    });

    // PetFi画面の遷移ボタン
    document.getElementById('btn-back-to-lcs-from-petfi').addEventListener('click', () => showScreen('lifetime-cost-screen'));
    document.getElementById('btn-back-to-main-from-petfi').addEventListener('click', () => showScreen('home-page-screen'));
    document.getElementById('btn-goto-sss-from-petfi').addEventListener('click', () => {
        const woof1Sound = document.getElementById('woof1-sound');
        if (woof1Sound) {
            woof1Sound.currentTime = 0;
            woof1Sound.play().catch(e => console.error("Sound play failed", e));
        }
        showScreen('savings-simulator-screen', sharedState.requiredInvestment);
    });

    // SSS画面の遷移ボタン
    document.getElementById('btn-back-to-lcs-from-sss').addEventListener('click', () => showScreen('lifetime-cost-screen'));
    document.getElementById('btn-back-to-petfi-from-sss').addEventListener('click', () => showScreen('petfi-screen'));
    document.getElementById('btn-back-to-home-from-sss').addEventListener('click', () => showScreen('home-page-screen'));

    // 設定画面関連
    document.getElementById('btn-settings').addEventListener('click', () => {
        populateSettingsForm();
        showScreen('settings-screen');
    });
    document.getElementById('btn-save-settings').addEventListener('click', saveSettings);
    document.getElementById('btn-reset-settings').addEventListener('click', resetSettings);
    document.getElementById('btn-back-to-main-from-settings').addEventListener('click', () => showScreen('home-page-screen'));

    // リセットボタン関連
    document.getElementById('reset-all-simulation-btn').addEventListener('click', resetAllSimulation);
    document.getElementById('reset-main-screen-inputs-btn').addEventListener('click', resetMainScreenInputs);
    document.getElementById('reset-lifecost-screen-inputs-btn').addEventListener('click', resetLifecostScreenInputs);
    document.getElementById('reset-savings-screen-inputs-btn').addEventListener('click', resetSavingsScreenInputs);
    document.getElementById('reset-petfi-screen-inputs-btn').addEventListener('click', resetPetfiScreenInputs);

    // その他
    document.getElementById('final-message-overlay').addEventListener('click', hideFinalMessage);
    [document.getElementById('initialInvestment'), document.getElementById('monthlyInvestment'), document.getElementById('kotsu-initial-investment'), document.getElementById('kotsu-monthly-investment'), document.getElementById('waku-initial-investment'), document.getElementById('waku-monthly-investment')].forEach(input => {
        if(input) {
            input.addEventListener('input', () => { formatInvestmentInput(input); });
            formatInvestmentInput(input);
        }
    });
}

// --- 画面遷移とUI操作 ---
function showScreen(screenId, targetAmount = 0) {
    // BGM Control
    const allBgms = [
        document.getElementById('bgm-sound'), // Main sim BGM
        document.getElementById('lcs-bgm'),
        document.getElementById('sss-bgm'),
        document.getElementById('petfi-bgm')
    ];
    allBgms.forEach(bgm => {
        if (bgm) {
            bgm.pause();
            bgm.currentTime = 0;
        }
    });

    let currentBgm = null;
    let volume = (settings.bgmVolume || 10) / 100; // Use setting for volume, default to 10%

    if (screenId === 'main-screen') {
        currentBgm = document.getElementById('bgm-sound');
    } else if (screenId === 'lifetime-cost-screen') {
        currentBgm = document.getElementById('lcs-bgm');
    } else if (screenId === 'savings-simulator-screen') {
        currentBgm = document.getElementById('sss-bgm');
    } else if (screenId === 'petfi-screen') {
        currentBgm = document.getElementById('petfi-bgm');
    }

    if (currentBgm) {
        currentBgm.volume = volume;
        currentBgm.play().catch(error => console.error(`BGM for ${screenId} play failed:`, error));
    }

    const allScreens = ['selection-screen', 'plan-selection-screen', 'main-screen', 'lifetime-cost-screen', 'petfi-screen', 'settings-screen', 'home-page-screen', 'savings-simulator-screen'];
    allScreens.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    // --- データ連携処理 ---
    if (screenId === 'petfi-screen') {
        const totalLifeCostInput = document.getElementById('petfi-total-life-cost-input');
        const monthlyCostInput = document.getElementById('petfi-monthly-cost-input');
        const petfiResultContainer = document.getElementById('petfi-result-container');

        // Populate editable total life cost input
        if (totalLifeCostInput) {
            totalLifeCostInput.value = lcsState.totalCost > 0 ? Math.round(lcsState.totalCost).toLocaleString() : '';
        }
        // If coming from LCS, update petfiDogSize to reflect LCS selection
        if (lcsState.totalCost > 0 && lcsState.size) {
            sharedState.petfiDogSize = lcsState.size;
        }
        // Update active state for dog size buttons
        document.querySelectorAll('#petfi-dog-size-selection .size-btn').forEach(b => b.classList.remove('active'));
        const currentPetFiSizeBtn = document.getElementById(`petfi-size-${sharedState.petfiDogSize}`);
        if (currentPetFiSizeBtn) {
            currentPetFiSizeBtn.classList.add('active');
        }

        // Hide result container initially
        if (petfiResultContainer) {
            petfiResultContainer.classList.add('hidden');
        }
        // Immediately calculate PetFi monthly cost when entering the screen
        calculatePetFiMonthlyCost();

    } else if (screenId === 'savings-simulator-screen') {
        const targetAmountInput = document.getElementById('sss-target-amount-input');
        if (targetAmountInput) {
            targetAmountInput.value = targetAmount > 0 ? Math.round(targetAmount) : 0; // Use targetAmount parameter
        }
        // SSS画面を開いたら、常に結果を0円にリセット
        document.getElementById('sss-result-amount').textContent = '0円';
    }
    
    const screenToShow = document.getElementById(screenId);
    if (screenToShow) screenToShow.classList.remove('hidden');

    if (screenId === 'selection-screen') {
        document.getElementById('breed-selection-area').innerHTML = '';
        const imageWrapper = document.getElementById('dog-image-wrapper');
        if (imageWrapper) imageWrapper.innerHTML = '';
    }
    window.scrollTo(0, 0);
}

// --- ライフコスト計算 (LCS) ---
let lcsState = { 
    size: 'small', 
    count: 1, 
    travelType: 'domestic',
    normalCost: 0,
    luxuryCost: 0,
    totalCost: 0,
    selectedPlan: 'normal' // 'normal' or 'luxury'
};

// 単位: 万円
const travelCosts = {
    domestic: { costPerPerson: 2, costPerDog: 2.2, baseCost: 1 },
    overseas: { costPerPerson: 5, costPerDog: 8, baseCost: 5 }
};

function initializeLcsCalculator() {
    document.querySelectorAll('#lcs-size-btns .size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#lcs-size-btns .size-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            lcsState.size = btn.dataset.size;
        });
    });

    const countSlider = document.getElementById('lcs-count-slider');
    if (countSlider) {
        countSlider.addEventListener('input', () => {
            lcsState.count = parseInt(countSlider.value, 10);
            document.getElementById('lcs-count-value').textContent = lcsState.count;
        });
    }

    document.getElementById('lcs-calculate-btn').addEventListener('click', () => {
        const woof2Sound = document.getElementById('woof2-sound');
        if (woof2Sound) {
            woof2Sound.currentTime = 0;
            woof2Sound.play().catch(e => console.error("Sound play failed", e));
        }
        calculateAndDisplayLcs();
    });

    document.querySelectorAll('#lcs-travel-type-btns .travel-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#lcs-travel-type-btns .travel-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            lcsState.travelType = btn.dataset.travelType;
        });
    });

    document.getElementById('lcs-add-luxury-btn').addEventListener('click', () => {
        const woof2Sound = document.getElementById('woof2-sound');
        if (woof2Sound) {
            woof2Sound.currentTime = 0;
            woof2Sound.play().catch(e => console.error("Sound play failed", e));
        }
        calculateAndAddLuxuryCost();
    });

    // Radio button selection logic
    const normalResultBox = document.getElementById('lcs-normal-cost-amount').closest('.lcs-result');
    const luxuryResultBox = document.getElementById('lcs-total-cost-amount').closest('.lcs-result');
    const normalRadio = document.getElementById('lcs-result-plan-normal');
    const luxuryRadio = document.getElementById('lcs-result-plan-luxury');

    function updatePlanSelection() {
        if (normalRadio.checked) {
            lcsState.selectedPlan = 'normal';
            normalResultBox.classList.add('selected');
            luxuryResultBox.classList.remove('selected');
        } else {
            lcsState.selectedPlan = 'luxury';
            luxuryResultBox.classList.add('selected');
            normalResultBox.classList.remove('selected');
        }
    }

    normalRadio.addEventListener('change', updatePlanSelection);
    luxuryRadio.addEventListener('change', updatePlanSelection);
    
    // Set initial state
    updatePlanSelection();
}

function updateLcsAndSharedState() {
    const data = dogData[lcsState.size];
    const costForPetFi = lcsState.selectedPlan === 'normal' ? lcsState.normalCost : lcsState.totalCost;
    const totalCostYen = costForPetFi * 10000;
    const totalMonths = data.lifespan * 12;
    sharedState.monthlyCostYen = totalMonths > 0 ? totalCostYen / totalMonths : 0;
}

function calculateAndDisplayLcs() {
    const data = dogData[lcsState.size];
    const annualCostPerDog = data.foodCost + data.medicalCost + data.groomingCost - data.puppyIncome;
    const lifetimeCost = ((annualCostPerDog * data.lifespan) + data.purchaseCost + data.funeralCost) * lcsState.count;
    
    lcsState.normalCost = lifetimeCost;
    lcsState.luxuryCost = 0;
    lcsState.totalCost = lcsState.normalCost;

    document.getElementById('lcs-normal-cost-amount').textContent = `${lcsState.normalCost.toLocaleString()}万円`;
    document.getElementById('lcs-total-cost-amount').textContent = `${lcsState.totalCost.toLocaleString()}万円`;
    document.getElementById('lcs-luxury-cost-result').textContent = '---';

    updateLcsAndSharedState();
}

function calculateAndAddLuxuryCost() {
    if (lcsState.normalCost === 0) {
        alert('先にノーマルプランでライフコストを計算してください。');
        return;
    }

    const frequency = parseInt(document.getElementById('lcs-travel-frequency').value) || 1;
    const duration = parseInt(document.getElementById('lcs-travel-duration').value) || 1;
    const people = parseInt(document.getElementById('lcs-travel-people').value) || 1;
    const dogs = parseInt(document.getElementById('lcs-travel-dogs').value) || 1;

    const travelData = travelCosts[lcsState.travelType];
    const costPerTrip = (travelData.costPerPerson * people) + (travelData.costPerDog * dogs) + travelData.baseCost;
    const singleTripCost = costPerTrip * duration;

    const dogLifespan = dogData[lcsState.size].lifespan;
    const numberOfTrips = Math.floor(dogLifespan / frequency);

    lcsState.luxuryCost = singleTripCost * numberOfTrips;
    lcsState.totalCost = lcsState.normalCost + lcsState.luxuryCost;

    // 新しい表示形式に合わせてlcs-total-cost-amountを更新
    document.getElementById('lcs-total-cost-amount').innerHTML =
        `${Math.round(lcsState.totalCost).toLocaleString()}万円 <span style="font-size: 0.7em; color: #777;">(旅行費用 ${Math.round(lcsState.luxuryCost).toLocaleString()}万円)</span>`;

    updateLcsAndSharedState();
}

// --- PetFi計算 ---
function initializePetFiCalculator() {
    const totalLifeCostInput = document.getElementById('petfi-total-life-cost-input');
    const monthlyCostInput = document.getElementById('petfi-monthly-cost-input');
    const yieldSlider = document.getElementById('petfi-yield-slider');
    const calculateBtn = document.getElementById('petfi-calculate-btn');
    const woof1Sound = document.getElementById('woof1-sound'); // Assuming woof1Sound is available

    // Add event listeners for formatting and calculation
    totalLifeCostInput.addEventListener('input', () => {
        calculatePetFiMonthlyCost(); // Recalculate monthly cost immediately on input
    });
    totalLifeCostInput.addEventListener('blur', () => {
        formatInvestmentInput(totalLifeCostInput, 9999999); // Format on blur
    });
    // monthlyCostInput is readonly, no direct input listener needed for calculation, but keep formatting for consistency
    monthlyCostInput.addEventListener('input', () => formatInvestmentInput(monthlyCostInput, 9999999));

    // Yield slider only updates display
    yieldSlider.addEventListener('input', () => {
        document.getElementById('petfi-yield-value').textContent = parseFloat(yieldSlider.value).toFixed(1);
    });

    // Calculate button listener
    calculateBtn.addEventListener('click', () => {
        if (woof1Sound) {
            woof1Sound.currentTime = 0;
            woof1Sound.play().catch(e => console.error("Sound play failed", e));
        }
        calculateAndDisplayPetFiResult(); // Calculate and show the final result
    });

    // NEW: Dog size selection for PetFi
    document.querySelectorAll('#petfi-dog-size-selection .size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#petfi-dog-size-selection .size-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            sharedState.petfiDogSize = btn.dataset.size;
            calculatePetFiMonthlyCost(); // Recalculate monthly cost when dog size changes
        });
    });
}

function calculatePetFiMonthlyCost() {
    const totalLifeCostInput = document.getElementById('petfi-total-life-cost-input');
    const totalLifeCostMan = parseFloat(totalLifeCostInput.value.replace(/,/g, '')) || 0;
    let monthlyCostYen = 0;

    // Determine lifespan based on selected dog size for PetFi
    const selectedDogSize = sharedState.petfiDogSize;
    const lifespan = dogData[selectedDogSize] ? dogData[selectedDogSize].lifespan : 0;

    if (totalLifeCostMan > 0 && lifespan > 0) {
        const totalCostYen = totalLifeCostMan * 10000;
        const totalMonths = lifespan * 12;
        monthlyCostYen = totalMonths > 0 ? totalCostYen / totalMonths : 0;
    } else {
        monthlyCostYen = 0; // Reset if no valid input for calculation
    }

    // Update the monthly cost input field
    document.getElementById('petfi-monthly-cost-input').value = Math.round(monthlyCostYen).toLocaleString();
    sharedState.monthlyCostYen = monthlyCostYen; // Update shared state
}

function calculateAndDisplayPetFiResult() {
    const monthlyCostYen = sharedState.monthlyCostYen || 0;
    const annualCostYen = monthlyCostYen * 12;
    const yieldRate = parseFloat(document.getElementById('petfi-yield-slider').value) / 100;
    
    let requiredInvestmentYen = 0;
    if (yieldRate > 0) {
        requiredInvestmentYen = annualCostYen / yieldRate;
    }

    const requiredInvestmentMan = requiredInvestmentYen / 10000;
    sharedState.requiredInvestment = requiredInvestmentMan;

    document.getElementById('petfi-result-amount').textContent = `${Math.round(requiredInvestmentMan).toLocaleString()}万円`;
    document.getElementById('petfi-result-container').classList.remove('hidden'); // Show result
}

// --- 目標資金準備シミュレーター (SSS) ---
function initializeSavingsSimulator() {
    // Add event listeners for formatting
    const targetAmountInput = document.getElementById('sss-target-amount-input');
    const initialInvestmentInput = document.getElementById('sss-initial-investment');
    
    targetAmountInput.addEventListener('input', () => formatInvestmentInput(targetAmountInput, 9999999));
    initialInvestmentInput.addEventListener('input', () => formatInvestmentInput(initialInvestmentInput, 9999999));

    // 「計算する」ボタンにのみイベントリスナーを設定
    const calcBtn = document.getElementById('sss-calculate-btn');
    const woof1Sound = document.getElementById('woof1-sound');
    calcBtn.addEventListener('click', () => {
        if (woof1Sound) {
            woof1Sound.currentTime = 0;
            woof1Sound.play().catch(e => console.error("Sound play failed", e));
        }
        calculateRequiredSavings();
    });

    // スライダーの値表示を更新するリスナーのみ残す
    const yieldSlider = document.getElementById('sss-yield-slider');
    if(yieldSlider) {
        yieldSlider.addEventListener('input', () => {
            document.getElementById('sss-yield-value').textContent = parseFloat(yieldSlider.value).toFixed(1);
        });
    }
}

function calculateRequiredSavings() {
    const FV_man = parseFloat(document.getElementById('sss-target-amount-input').value.replace(/,/g, '')) || 0;
    const PV_man = parseFloat(document.getElementById('sss-initial-investment').value.replace(/,/g, '')) || 0;
    const t = parseInt(document.getElementById('sss-years').value) || 10;
    const r = parseFloat(document.getElementById('sss-yield-slider').value) / 100;

    if (FV_man <= PV_man) {
        document.getElementById('sss-result-amount').textContent = '0円';
        return;
    }

    let pmt_man = 0;
    if (r === 0) {
        pmt_man = (FV_man - PV_man) / (t * 12);
    } else {
        const i = r / 12;
        const n = t * 12;
        const futureValueOfPV_man = PV_man * Math.pow(1 + i, n);
        pmt_man = (FV_man - futureValueOfPV_man) * (i / (Math.pow(1 + i, n) - 1));
    }

    const pmt_yen = pmt_man * 10000;

    document.getElementById('sss-result-amount').textContent = (pmt_yen > 0) ? `${Math.ceil(pmt_yen).toLocaleString()}円` : '0円';
}

// --- 設定画面 (単位: 万円) ---
const defaultDogData = {
    small: { lifespan: 15, purchaseCost: 20, foodCost: 6, medicalCost: 7, groomingCost: 5, funeralCost: 3, puppyIncome: 1 },
    medium: { lifespan: 13, purchaseCost: 15, foodCost: 10, medicalCost: 8, groomingCost: 7, funeralCost: 5, puppyIncome: 1 },
    large: { lifespan: 10, purchaseCost: 10, foodCost: 18, medicalCost: 10, groomingCost: 3, funeralCost: 7, puppyIncome: 1 }
};
let dogData = JSON.parse(JSON.stringify(defaultDogData));
let settings = { defaultYield: 4.0, kotsuYield: 2.0, wakuYield: 5.0, breedingSuccessRate: 40, neuterRate: 50, bgmVolume: 10 };
const defaultSettings = JSON.parse(JSON.stringify(settings));

function populateSettingsForm() {
    try {
        for (const size in dogData) {
            for (const key in dogData[size]) {
                const input = document.querySelector(`#settings-form input[data-size="${size}"][data-key="${key}"]`);
                if (input) input.value = dogData[size][key];
            }
        }
        document.getElementById('settings-default-yield').value = settings.defaultYield;
        document.getElementById('settings-kotsu-yield').value = settings.kotsuYield;
        document.getElementById('settings-waku-yield').value = settings.wakuYield;
        document.getElementById('settings-breeding-rate').value = settings.breedingSuccessRate;
        document.getElementById('settings-neuter-rate').value = settings.neuterRate;
        document.getElementById('settings-bgm-volume').value = settings.bgmVolume;
    } catch (error) {
        console.error("Error in populateSettingsForm:", error);
    }
}

function saveSettings() {
    document.querySelectorAll('#settings-form input[data-size]').forEach(input => {
        const { size, key } = input.dataset;
        dogData[size][key] = parseFloat(input.value) || 0;
    });
    settings.defaultYield = parseFloat(document.getElementById('settings-default-yield').value) || 4.0;
    settings.kotsuYield = parseFloat(document.getElementById('settings-kotsu-yield').value) || 2.0;
    settings.wakuYield = parseFloat(document.getElementById('settings-waku-yield').value) || 5.0;
    // Correctly handle 0 as a valid input for breedingSuccessRate and neuterRate
    settings.breedingSuccessRate = parseInt(document.getElementById('settings-breeding-rate').value, 10);
    if (isNaN(settings.breedingSuccessRate)) settings.breedingSuccessRate = 40; // Default if not a number

    settings.neuterRate = parseInt(document.getElementById('settings-neuter-rate').value, 10);
    if (isNaN(settings.neuterRate)) settings.neuterRate = 50; // Default if not a number

    settings.bgmVolume = parseFloat(document.getElementById('settings-bgm-volume').value) || 10;
    localStorage.setItem('dogSimSettings', JSON.stringify({ dogData, settings }));
    alert('設定を保存しました。');
    if (!document.getElementById('lifetime-cost-screen').classList.contains('hidden')) calculateAndDisplayLcs();
    if (!document.getElementById('petfi-screen').classList.contains('hidden')) calculatePetFiMonthlyCost();
}

function resetSettings() {
    if (confirm('本当にすべての設定を初期値に戻しますか？')) {
        localStorage.removeItem('dogSimSettings');
        dogData = JSON.parse(JSON.stringify(defaultDogData));
        settings = JSON.parse(JSON.stringify(defaultSettings));
        populateSettingsForm();
        alert('設定をリセットしました。');
    }
}

function loadSettings() {
    const saved = localStorage.getItem('dogSimSettings');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // Merge parsed settings with default settings to ensure all properties exist and handle 0 as a valid value
            settings = { ...JSON.parse(JSON.stringify(defaultSettings)), ...parsed.settings };
            dogData = parsed.dogData || JSON.parse(JSON.stringify(defaultDogData)); // dogData still uses old logic
        } catch (error) {
            console.error("Failed to load settings from localStorage.", error);
            dogData = JSON.parse(JSON.stringify(defaultDogData));
            settings = JSON.parse(JSON.stringify(defaultSettings));
        }
    }
    const petfiYieldSlider = document.getElementById('petfi-yield-slider');
    if (petfiYieldSlider) {
        petfiYieldSlider.value = settings.defaultYield;
        document.getElementById('petfi-yield-value').textContent = parseFloat(settings.defaultYield).toFixed(1);
    }
    populateSettingsForm();
}

function resetPetfiScreenInputs() {
    const totalLifeCostInput = document.getElementById('petfi-total-life-cost-input');
    if (totalLifeCostInput) {
        totalLifeCostInput.value = ""; // 未入力
        formatInvestmentInput(totalLifeCostInput);
    }

    const yieldSlider = document.getElementById('petfi-yield-slider');
    if (yieldSlider) {
        yieldSlider.value = "4";
        document.getElementById('petfi-yield-value').textContent = "4.0"; // 表示も更新
    }

    // 犬のサイズ (デフォルト: 小型犬)
    document.querySelectorAll('#petfi-dog-size-selection .size-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const smallDogBtn = document.getElementById('petfi-size-small');
    if (smallDogBtn) smallDogBtn.classList.add('active');

    // 結果表示のリセット
    const petfiResultAmount = document.getElementById('petfi-result-amount');
    if (petfiResultAmount) petfiResultAmount.textContent = '---';
    const petfiResultContainer = document.getElementById('petfi-result-container');
    if (petfiResultContainer) petfiResultContainer.classList.add('hidden');
    const petfiMonthlyCostInput = document.getElementById('petfi-monthly-cost-input');
    if (petfiMonthlyCostInput) petfiMonthlyCostInput.value = "";

    // sharedStateのpetfiDogSizeもリセット
    sharedState.petfiDogSize = 'small';
}

function resetSavingsScreenInputs() {
    const targetAmountInput = document.getElementById('sss-target-amount-input');
    if (targetAmountInput) {
        targetAmountInput.value = ""; // 未入力
        formatInvestmentInput(targetAmountInput);
    }

    const initialInvestmentInput = document.getElementById('sss-initial-investment');
    if (initialInvestmentInput) {
        initialInvestmentInput.value = "0";
        formatInvestmentInput(initialInvestmentInput);
    }

    const yearsInput = document.getElementById('sss-years');
    if (yearsInput) yearsInput.value = "10";

    const yieldSlider = document.getElementById('sss-yield-slider');
    if (yieldSlider) {
        yieldSlider.value = "3";
        document.getElementById('sss-yield-value').textContent = "3.0"; // 表示も更新
    }

    // 結果表示のリセット
    const sssResultAmount = document.getElementById('sss-result-amount');
    if (sssResultAmount) sssResultAmount.textContent = '---';
}

function resetLifecostScreenInputs() {
    // 入力フィールドのリセット
    const travelFrequencyInput = document.getElementById('lcs-travel-frequency');
    if (travelFrequencyInput) travelFrequencyInput.value = "2";

    const travelDurationInput = document.getElementById('lcs-travel-duration');
    if (travelDurationInput) travelDurationInput.value = "1";

    const travelPeopleInput = document.getElementById('lcs-travel-people');
    if (travelPeopleInput) travelPeopleInput.value = "1";

    const travelDogsInput = document.getElementById('lcs-travel-dogs');
    if (travelDogsInput) travelDogsInput.value = "1";

    const countSlider = document.getElementById('lcs-count-slider');
    if (countSlider) {
        countSlider.value = "1";
        document.getElementById('lcs-count-value').textContent = "1"; // 表示も更新
    }

    // ラジオボタンのリセット (ノーマルプランをデフォルトに)
    const normalRadio = document.getElementById('lcs-result-plan-normal');
    if (normalRadio) normalRadio.checked = true;
    const luxuryRadio = document.getElementById('lcs-result-plan-luxury');
    if (luxuryRadio) luxuryRadio.checked = false;

    // ボタン群 (activeクラス) のリセット
    // 犬のサイズ (デフォルト: 小型犬)
    document.querySelectorAll('#lcs-size-btns .size-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const smallDogBtn = document.querySelector('#lcs-size-btns button[data-size="small"]');
    if (smallDogBtn) smallDogBtn.classList.add('active');

    // 旅行の種類 (デフォルト: 国内)
    document.querySelectorAll('#lcs-travel-type-btns .travel-type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const domesticTravelBtn = document.querySelector('#lcs-travel-type-btns button[data-travel-type="domestic"]');
    if (domesticTravelBtn) domesticTravelBtn.classList.add('active');

    // lcsStateの初期化 (グローバル変数)
    lcsState = { 
        size: 'small', 
        count: 1, 
        travelType: 'domestic',
        normalCost: 0,
        luxuryCost: 0,
        totalCost: 0,
        selectedPlan: 'normal'
    };

    // 結果表示のリセット
    const normalCostAmount = document.getElementById('lcs-normal-cost-amount');
    if (normalCostAmount) normalCostAmount.textContent = '---';
    const totalCostAmount = document.getElementById('lcs-total-cost-amount');
    if (totalCostAmount) totalCostAmount.textContent = '---';
    const luxuryCostResult = document.getElementById('lcs-luxury-cost-result');
    if (luxuryCostResult) luxuryCostResult.textContent = '---';

    // プラン選択のUIを更新
    const normalResultBox = document.getElementById('lcs-normal-cost-amount').closest('.lcs-result');
    const luxuryResultBox = document.getElementById('lcs-total-cost-amount').closest('.lcs-result');
    if (normalResultBox) normalResultBox.classList.add('selected');
    if (luxuryResultBox) luxuryResultBox.classList.remove('selected');
}

function resetMainScreenInputs() {
    const initialDogsInput = document.getElementById('initialDogs');
    if (initialDogsInput) initialDogsInput.value = "1";

    const initialDogAgeInput = document.getElementById('initialDogAge');
    if (initialDogAgeInput) initialDogAgeInput.value = "0";

    const initialInvestmentInput = document.getElementById('initialInvestment');
    if (initialInvestmentInput) {
        initialInvestmentInput.value = "100";
        formatInvestmentInput(initialInvestmentInput);
    }

    const monthlyInvestmentInput = document.getElementById('monthlyInvestment');
    if (monthlyInvestmentInput) {
        monthlyInvestmentInput.value = "0";
        formatInvestmentInput(monthlyInvestmentInput);
    }

    const yearsInput = document.getElementById('years');
    if (yearsInput) yearsInput.value = "1";

    // シミュレーション結果表示をリセット
    const dogOutput = document.getElementById('dog-output');
    if (dogOutput) dogOutput.textContent = '-- 頭';
    const assetOutput = document.getElementById('asset-output');
    if (assetOutput) assetOutput.textContent = '-- 万円';
    const dogBreedDisplay = document.getElementById('dog-breed-display');
    if (dogBreedDisplay) dogBreedDisplay.textContent = '犬種: --';
    const planDisplay = document.getElementById('plan-display');
    if (planDisplay) planDisplay.textContent = 'プラン: --';
    const dogImageWrapper = document.getElementById('dog-image-wrapper');
    if (dogImageWrapper) dogImageWrapper.innerHTML = '';
    const dogVisualizationArea = document.getElementById('dog-visualization-area');
    if (dogVisualizationArea) dogVisualizationArea.innerHTML = '';
    const assetChartContainer = document.getElementById('asset-chart-container');
    if (assetChartContainer) assetChartContainer.innerHTML = '';
}

function resetAllSimulation() {
    if (confirm('本当にすべてのシミュレーションデータを初期状態に戻しますか？')) {
        // グローバル変数の初期化
        userSelections = { dogSize: null, breedName: null, annualRate: null, planName: null, initialInvestment: null, monthlyInvestment: null };
        dogSimState = { dogs: [], currentYear: 0, timer: null, isStatisticalMode: false };
        sharedState = {
            monthlyCostYen: 0,
            requiredInvestment: 0,
            petfiDogSize: 'small'
        };
        lcsState = { 
            size: 'small', 
            count: 1, 
            travelType: 'domestic',
            normalCost: 0,
            luxuryCost: 0,
            totalCost: 0,
            selectedPlan: 'normal'
        };

        // localStorageのクリア
        localStorage.removeItem('dogSimSettings'); // 設定もリセット
        // 必要に応じて他のlocalStorageデータもクリア

        // 各ページの入力値をデフォルトに戻す
        resetMainScreenInputs();
        resetLifecostScreenInputs();
        resetSavingsScreenInputs();
        resetPetfiScreenInputs();

        // 画面をTOPページに戻す
        showScreen('home-page-screen');
        alert('すべてのシミュレーションデータを初期状態に戻しました。');
    }
}

// --- アプリの起動処理 ---
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    initializeLcsCalculator();
    initializePetFiCalculator();
    initializeSavingsSimulator();
    loadSettings();
    showScreen('home-page-screen');
});

// ===============================================================
//         以下、変更不要な関数群
// ===============================================================

function showBreedSelection(size) {
    userSelections.dogSize = size;
    const breedArea = document.getElementById('breed-selection-area');
    breedArea.innerHTML = '';

    breeds[size].forEach(breedName => {
        const tile = document.createElement('div');
        tile.className = 'breed-tile';
        tile.onclick = () => selectBreed(breedName);

        const img = document.createElement('img');
        img.src = `dog_image/${breedName}.png`;
        img.alt = breedName;
        img.className = 'breed-image';
        img.onerror = () => { tile.style.display = 'none'; };

        const caption = document.createElement('div');
        caption.className = 'breed-caption';
        caption.textContent = breedName;

        tile.appendChild(img);
        tile.appendChild(caption);
        breedArea.appendChild(tile);
    });

    document.getElementById('plan-selection-screen').scrollIntoView({ behavior: 'smooth' });
}

function selectBreed(breedName) {
    userSelections.breedName = breedName;
    showScreen('plan-selection-screen');
}

function selectPlan(planType) {
    let rate, planName, initialInvestment, monthlyInvestment;

    if (planType === 'kotsu') {
        rate = settings.kotsuYield / 100;
        planName = 'こつこつプラン';
        initialInvestment = document.getElementById('kotsu-initial-investment').value;
        monthlyInvestment = document.getElementById('kotsu-monthly-investment').value;
    } else { // waku
        rate = settings.wakuYield / 100;
        planName = 'わくわくプラン';
        initialInvestment = document.getElementById('waku-initial-investment').value;
        monthlyInvestment = document.getElementById('waku-monthly-investment').value;
    }

    userSelections.annualRate = rate;
    userSelections.planName = planName;
    userSelections.initialInvestment = initialInvestment;
    userSelections.monthlyInvestment = monthlyInvestment;

    showScreen('main-screen');
    
    document.getElementById('annualRate').value = rate * 100;
    document.getElementById('initialInvestment').value = initialInvestment;
    document.getElementById('monthlyInvestment').value = monthlyInvestment;
    
    document.getElementById('dog-breed-display').textContent = `犬種: ${userSelections.breedName}`;
    document.getElementById('plan-display').textContent = `プラン: ${userSelections.planName}`;

    const imageContainer = document.getElementById('dog-image-wrapper');
    if (imageContainer) {
        imageContainer.innerHTML = '';
        const img = document.createElement('img');
        img.src = `dog_image/${userSelections.breedName}.png`;
        img.alt = userSelections.breedName;
        img.className = 'selected-dog-image';
        imageContainer.appendChild(img);
    }
}

function runAllSimulations() {
    displayAssetCalculation();
    startDogSimulation();
}

function formatInvestmentInput(input, max = Infinity) {
    let value = input.value.replace(/,/g, '');
    if (!/^\d*$/.test(value)) { value = value.replace(/[^\d]/g, ''); }
    if (value === '') { input.value = ''; return; }
    let numValue = parseInt(value, 10);
    if (numValue < 0) numValue = 0;
    if (numValue > max) numValue = max;
    input.value = numValue.toLocaleString();
}

function showFinalMessage() {
    const overlay = document.getElementById('final-message-overlay');
    overlay.classList.remove('hidden');
    setTimeout(() => { overlay.classList.add('visible'); }, 10);
}

function hideFinalMessage() {
    const overlay = document.getElementById('final-message-overlay');
    overlay.classList.remove('visible');
    setTimeout(() => { overlay.classList.add('hidden'); }, 1500);
}

function displayAssetCalculation() {
    const initialInvestment = parseFloat(document.getElementById('initialInvestment').value.replace(/,/g, '')) * 10000;
    const monthlyInvestment = parseFloat(document.getElementById('monthlyInvestment').value.replace(/,/g, '')) * 10000;
    const annualRate = parseFloat(document.getElementById('annualRate').value) / 100;
    const years = parseInt(document.getElementById('years').value);
    const outputDiv = document.getElementById('asset-output');

    if (isNaN(initialInvestment) || isNaN(monthlyInvestment) || isNaN(annualRate) || isNaN(years)) {
        outputDiv.textContent = '--';
        return;
    }

    const results = calculateAssets(initialInvestment, monthlyInvestment, annualRate, years);
    const finalAmount = results[results.length - 1];
    outputDiv.textContent = `${Math.round(finalAmount / 10000).toLocaleString()} 万円`;
    drawAssetChart(results, document.getElementById('asset-chart-container'));
}

function calculateAssets(initialInvestment, monthlyInvestment, annualRate, years) {
    const assetHistory = [initialInvestment];
    let currentAmount = initialInvestment;
    const monthlyRate = annualRate / 12;

    for (let i = 0; i < years; i++) {
        let yearEndAmount = currentAmount;
        for (let month = 0; month < 12; month++) {
            yearEndAmount += monthlyInvestment;
            yearEndAmount *= (1 + monthlyRate);
        }
        currentAmount = yearEndAmount;
        assetHistory.push(currentAmount);
    }
    return assetHistory;
}

function drawAssetChart(data, container) {
    container.innerHTML = '';
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const maxVal = Math.max(...data);
    const minVal = data[0] / 2;

    const xScale = (i) => padding.left + (i / (data.length - 1)) * (width - padding.left - padding.right);
    const yScale = (d) => height - padding.bottom - ((d - minVal) / (maxVal - minVal || 1)) * (height - padding.top - padding.bottom);

    const pathPoints = data.map((d, i) => `${xScale(i)},${yScale(d)}`);
    const pathD = `M ${pathPoints.join(' L ')}`;
    const areaPoints = `${xScale(0)},${yScale(minVal)} ${pathPoints.join(' ')} ${xScale(data.length - 1)},${yScale(minVal)}`;

    let grid = '';
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + i * (height - padding.top - padding.bottom) / 5;
        grid += `<line class="grid-line" x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" />`;
        const labelVal = minVal + (maxVal - minVal) * (1 - i / 5);
        grid += `<text class="axis-text" x="${padding.left - 10}" y="${y + 4}" text-anchor="end">${(labelVal / 10000).toFixed(0)}万</text>`;
    }

    svg.innerHTML = `
        <defs>
            <linearGradient id="area-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#3498db;stop-opacity:0.4" />
                <stop offset="100%" style="stop-color:#3498db;stop-opacity:0.05" />
            </linearGradient>
        </defs>
        ${grid}
        <path class="chart-area" d="M ${areaPoints} Z" />
        <path class="chart-path" fill="none" d="${pathD}"/>
        <text class="axis-text" x="${width / 2}" y="${height - 5}" text-anchor="middle">運用年数</text>
    `;

    container.appendChild(svg);

    const chartPath = svg.querySelector('.chart-path');
    const chartArea = svg.querySelector('.chart-area');
    if (chartPath && chartArea) {
        const pathLength = chartPath.getTotalLength();
        chartPath.style.setProperty('--path-length', pathLength);
        chartPath.style.strokeDasharray = pathLength;
        setTimeout(() => {
            chartPath.classList.add('animate');
            chartArea.classList.add('animate');
        }, 100);
    }
}

function startDogSimulation() {
    clearTimeout(dogSimState.timer);
    const initialDogs = parseInt(document.getElementById('initialDogs').value);
    const years = parseInt(document.getElementById('years').value);
    const initialDogAge = parseInt(document.getElementById('initialDogAge').value) || 0; // Read new input
    if (isNaN(initialDogs) || isNaN(years) || isNaN(initialDogAge) || !userSelections.dogSize) { return; }

    dogSimState.isStatisticalMode = false;
    dogSimState.currentYear = 0;
    dogSimState.dogs = [];
    
    for (let i = 0; i < initialDogs; i++) {
        let dog = { 
            id: `dog-${Date.now()}-${Math.random()}`, 
            isNeutered: Math.random() < ((settings.neuterRate || 50) / 100)
        };

        if (i === 0) {
            // The very first dog is always female with specified initial age
            dog.gender = 'female';
            dog.birthYear = dogSimState.currentYear - initialDogAge; // Set birthYear based on initialDogAge
        } else {
            // Subsequent initial dogs have a random gender and start at age 0
            dog.gender = Math.random() < 0.5 ? 'male' : 'female';
            dog.birthYear = 0; 
        }
        dogSimState.dogs.push(dog);
    }
    
    updateDogVisualization();
    runSimulationStep(years);
}

function runSimulationStep(maxYears) {
    if (dogSimState.dogs.length > 10000 && !dogSimState.isStatisticalMode) {
        dogSimState.isStatisticalMode = true;
        runStatisticalSimulation(maxYears);
        return;
    }

    dogSimState.currentYear += 0.5;
    if (dogSimState.currentYear > maxYears) {
        if (maxYears >= 20) { showFinalMessage(); }
        return;
    }
    
    calculateOneStepIndividually();
    updateDogVisualization();
    dogSimState.timer = setTimeout(() => runSimulationStep(maxYears), 200);
}

function calculateOneStepIndividually() {
    const params = dogParams[userSelections.dogSize];
    const baseProb = (settings.breedingSuccessRate || 40) / 100;
    const fluctuation = 0.10; // The range of fluctuation (+/- 10%)
    const minProb = Math.max(0, baseProb - fluctuation);
    const maxProb = Math.min(1, baseProb + fluctuation);
    const birthProb = Math.random() * (maxProb - minProb) + minProb; // Get a random probability within the range for this step
    let newPuppies = [];

    dogSimState.dogs.forEach(dog => {
        // Check if the dog is female, not neutered, and of breeding age
        if (dog.gender === 'female' && !dog.isNeutered) {
            const age = dogSimState.currentYear - dog.birthYear;
            if (age >= params.minAge && age < params.maxAge && Math.random() < birthProb) {
                const pupsCount = Math.max(1, Math.round(randomNormal(params.meanPups, params.stdPups)));
                for (let i = 0; i < pupsCount; i++) {
                    const gender = Math.random() < 0.5 ? 'male' : 'female';
                    newPuppies.push({ 
                        id: `dog-${Date.now()}-${Math.random()}`, 
                        birthYear: dogSimState.currentYear, 
                        gender: gender,
                        isNeutered: Math.random() < ((settings.neuterRate || 50) / 100)
                    });
                }
            }
        }
    });

    // If new puppies are born, play the sound
    if (newPuppies.length > 0) {
        const woofSound = document.getElementById('woof-sound');
        if (woofSound) {
            woofSound.volume = 1.0; // Set woof volume to 100%
            woofSound.currentTime = 0; // Rewind to the start
            woofSound.play().catch(error => console.error("Audio play failed:", error));
        }
    }

    let survivingDogs = [];
    dogSimState.dogs.forEach(dog => {
        const age = dogSimState.currentYear - dog.birthYear;
        let survivalProb = 1.0;
        if (age > params.declineStartAge) {
            const ageOver = age - params.declineStartAge;
            const lifeSpan = params.lifeExpectancy - params.declineStartAge;
            if (lifeSpan > 0) { survivalProb = 1.0 - Math.pow(ageOver / lifeSpan, 2); } else { survivalProb = 0; }
        }
        if (Math.random() <= survivalProb) {
            survivingDogs.push(dog);
        }
    });
    
    dogSimState.dogs = survivingDogs.concat(newPuppies);
}

function runStatisticalSimulation(maxYears) {
    const params = dogParams[userSelections.dogSize];
    const breedingWindow = params.maxAge - params.minAge;
    const breedingRatio = breedingWindow / params.lifeExpectancy; 
    const annualDeathRate = 1 / params.lifeExpectancy;
    let currentPopulation = dogSimState.dogs.length;

    while (dogSimState.currentYear <= maxYears) {
        dogSimState.currentYear += 0.5;
        const femalePopulation = currentPopulation * 0.5;
        const breedingDogs = femalePopulation * breedingRatio;
        const newPuppiesCount = breedingDogs * params.meanPups * 0.5 * 0.7;
        const deathsCount = currentPopulation * (annualDeathRate * 0.5);
        currentPopulation += newPuppiesCount - deathsCount;
    }

    dogSimState.dogs.length = Math.round(currentPopulation);

    updateDogVisualization();
    if (maxYears >= 20) { showFinalMessage(); }
}

function updateDogVisualization() {
    const vizArea = document.getElementById('dog-visualization-area');
    const outputDiv = document.getElementById('dog-output');
    const totalDogs = dogSimState.dogs.length;

    outputDiv.textContent = `${totalDogs.toLocaleString()} 頭`;
    vizArea.innerHTML = '';

    if (totalDogs > 100) {
        vizArea.innerHTML = `<div class="overload-image-wrapper"><img src="dog_image/計算不能な数…！.png" alt="計算不能な数…！" class="overload-image"></div>`;
        return;
    }

    const displayCount = Math.min(totalDogs, 21);
    const dogImageSrc = `dog_image/${userSelections.breedName}.png`;

    for (let i = 0; i < displayCount; i++) {
        const iconImg = document.createElement('img');
        iconImg.src = dogImageSrc;
        iconImg.alt = userSelections.breedName;
        iconImg.className = 'dog-icon';
        iconImg.style.animation = `dogIconFadeIn 0.5s ${i * 0.05}s forwards`;
        vizArea.appendChild(iconImg);
    }
}

function randomNormal(mean, std) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return mean + std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}