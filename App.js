import React, { useRef, useState, useEffect } from 'react';
import { Modal, Image, View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, Alert, BackHandler } from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import wordList from './assets/tdk_words.json';

const isWordValid = (word) => {
    return wordList.words.includes(word.toLowerCase());
};
const { width, height } = Dimensions.get('window');

const harfDagilimi = {
    A: { adet: 12, puan: 1 }, B: { adet: 2, puan: 3 }, C: { adet: 2, puan: 4 }, Ç: { adet: 2, puan: 4 },
    D: { adet: 2, puan: 3 }, E: { adet: 8, puan: 1 }, F: { adet: 1, puan: 7 }, G: { adet: 1, puan: 8 },
    Ğ: { adet: 1, puan: 8 }, H: { adet: 1, puan: 5 }, I: { adet: 2, puan: 2 }, İ: { adet: 7, puan: 1 },
    J: { adet: 1, puan: 10 }, K: { adet: 7, puan: 1 }, L: { adet: 7, puan: 1 }, M: { adet: 4, puan: 2 },
    N: { adet: 5, puan: 1 }, O: { adet: 3, puan: 2 }, Ö: { adet: 1, puan: 7 }, P: { adet: 1, puan: 5 },
    R: { adet: 6, puan: 1 }, S: { adet: 3, puan: 2 }, Ş: { adet: 2, puan: 4 }, T: { adet: 5, puan: 1 },
    U: { adet: 3, puan: 2 }, Ü: { adet: 2, puan: 3 }, V: { adet: 1, puan: 7 }, Y: { adet: 2, puan: 3 },
    Z: { adet: 2, puan: 4 }, JOKER: { adet: 2, puan: 0 }
};

const baslangicHarfTorbasi = [];
Object.entries(harfDagilimi).forEach(([harf, { adet }]) => {
    for (let i = 0; i < adet; i++) {
        baslangicHarfTorbasi.push(harf);
    }
});

const App = () => {
    const harfTorbasıRef = useRef([...baslangicHarfTorbasi]);
    const [jokerModalVisible, setJokerModalVisible] = useState(false);
    const [jokerPlacement, setJokerPlacement] = useState(null); // { index: number, player: number }
    const alfabeArray = [...'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'];
    const [gecersizIndexes, setGecersizIndexes] = useState([]);
    const [bosHamleSayisi, setBosHamleSayisi] = useState(0);

    const [jokerTargetIndex, setJokerTargetIndex] = useState(null);
    const [jokerPendingLetter, setJokerPendingLetter] = useState(null);
    const generateNewLetters = (adet) => {
        const torba = harfTorbasıRef.current;
        const yeniHarfler = [];
        for (let i = 0; i < adet; i++) {
            if (torba.length === 0) break;
            const randomIndex = Math.floor(Math.random() * torba.length);
            yeniHarfler.push(torba.splice(randomIndex, 1)[0]);
        }
        harfTorbasıRef.current = torba;
        return yeniHarfler;
    };

    const rastgeleHarfCek = () => {
        if (harfTorbasıRef.current.length === 0) return null;
        const rastgeleIndex = Math.floor(Math.random() * harfTorbasıRef.current.length);
        return harfTorbasıRef.current.splice(rastgeleIndex, 1)[0];
    };

    const createOyuncuHarfleri = () => {
        let harfler = [];
        for (let i = 0; i < 7; i++) {
            const harf = rastgeleHarfCek();
            if (harf) harfler.push(harf);
            else break;
        }
        return harfler.sort(() => Math.random() - 0.5);
    };
    const [bonusKullanim, setBonusKullanim] = useState({});

    const [placedIndexes, setPlacedIndexes] = useState([]);
    const [wordArray, setwordArray] = useState(wordList.words);
    const [word, setWord] = useState(Array(225).fill(''));
    const [isActionsMenuVisible, setIsActionsMenuVisible] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    const [changeLettersModalVisible, setChangeLettersModalVisible] = useState(false);
    const [suruklenenHarf, setSuruklenenHarf] = useState(null);
    const [parmakPozisyonu, setParmakPozisyonu] = useState({ x: 0, y: 0 });

    const [history, setHistory] = useState([]);
    const boxRefs = useRef([]);
    const dragX = useSharedValue(0);
    const dragY = useSharedValue(0);
    const [players, setPlayers] = useState([
        { name: 'Oyuncu 1', score: 0 },
        { name: 'Oyuncu 2', score: 0 }
    ]);
    const [currentPlayer, setCurrentPlayer] = useState(0);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: dragX.value }, { translateY: dragY.value }]
    }));
    const [selectedLettersToChange, setSelectedLettersToChange] = useState([]);
    const [isHarfDurumuVisible, setIsHarfDurumuVisible] = useState(false);
    const [kalanHarfSayisiMetni, setKalanHarfSayisiMetni] = useState('');
    const [playerLetters, setPlayerLetters] = useState([
        createOyuncuHarfleri(),
        createOyuncuHarfleri()
    ]);

    const ORTA_KUTU_INDEX = 112;

    const bonusCells = {
        TW: [2, 12, 30, 44, 180, 194, 212, 222],
        DW: [37, 48, 56, 107, 117, 168, 176, 187],
        TL: [16, 28, 64, 70, 154, 160, 196, 208],
        DL: [5, 9, 21, 23, 75, 80, 84, 89, 91, 96, 98, 103, 121, 126, 128, 133, 135, 140, 144, 149, 201, 203, 215, 219]
    };

    const getBonusType = (index) => {
        if (bonusCells.TW.includes(index)) return { type: 'word', multiplier: 3, label: '3K' };
        if (bonusCells.DW.includes(index)) return { type: 'word', multiplier: 2, label: '2K' };
        if (bonusCells.TL.includes(index)) return { type: 'letter', multiplier: 3, label: '3H' };
        if (bonusCells.DL.includes(index)) return { type: 'letter', multiplier: 2, label: '2H' };
        return null;
    };

    const bonusStyle = (bonus) => {
        if (!bonus) {
            return {};
        }
        switch (bonus.type) {
            case 'word':
                if (bonus.multiplier === 3) {
                    return { backgroundColor: '#d3a27f' };
                } else if (bonus.multiplier === 2) {
                    return { backgroundColor: '#b7d5ac' };
                }
                break;
            case 'letter':
                if (bonus.multiplier === 3) {
                    return { backgroundColor: '#ffd1dc' };
                } else if (bonus.multiplier === 2) {
                    return { backgroundColor: '#bbd1e1' };
                }
                break;
            default:
                return {};
        }
        return {};
    };
    const isBonusCell = (index) => Object.values(bonusCells).flat().includes(index);

    const harfPuaniniGetir = (harf) => {
        const buyukHarf = harf.toUpperCase();
        if (buyukHarf === 'I') {
            return harfDagilimi['İ'] ? harfDagilimi['İ'].puan : 0;
        }
        return harfDagilimi[buyukHarf]?.puan || 0;
    };

    const getKalanHarfler = () => {
        const kalanlar = {};
        for (const harf of harfTorbasıRef.current) {
            kalanlar[harf] = (kalanlar[harf] || 0) + 1;
        }
        for (const harf in harfDagilimi) {
            if (!kalanlar[harf]) kalanlar[harf] = 0;
        }
        return kalanlar;
    };

    const isWordConnected = (placedIndexes) => {
        if (history.length === 0) return true;
        return placedIndexes.some(index => {
            const rowSize = 15;
            const isLeft = index % rowSize !== 0 && word[index - 1] !== '';
            const isRight = (index + 1) % rowSize !== 0 && word[index + 1] !== '';
            const isTop = index >= rowSize && word[index - rowSize] !== '';
            const isBottom = index < word.length - rowSize && word[index + rowSize] !== '';
            return isLeft || isRight || isTop || isBottom;
        });
    };
    const validateWordPlacement = (placedIndexes) => {
        if (placedIndexes.length === 0) return false;

        const isHorizontal = placedIndexes.every(index => Math.floor(index / 15) === Math.floor(placedIndexes[0] / 15));
        const isVertical = placedIndexes.every(index => index % 15 === placedIndexes[0] % 15);

        if (!isHorizontal && !isVertical) {
            Alert.alert('Hata', 'Yerleştirilen harfler yatay veya dikey bir çizgi oluşturmalıdır.');
            return false;
        }
        if (history.length === 0 && !placedIndexes.includes(112)) {
            Alert.alert('Kural', 'İlk kelime orta kareye (ortadaki kutu) değmelidir.');
            return false;
        }

        if (history.length > 0 && !isWordConnected(placedIndexes)) {
            Alert.alert('Hata', 'Geçersiz hamle');
            return false;
        }

        // Çakışma kontrolü: Yerleştirilen indekslerde zaten harf olmamalı
        const doesOverlap = placedIndexes.some(index => history.some(move => move.index === index && move.cleared));
        if (doesOverlap) {
            Alert.alert('Hata', 'Seçilen hücrelerde zaten harf bulunmaktadır.');
            return false;
        }

        // Boşluk kontrolü: Yerleştirilen harfler arasında boşluk olmamalı (eğer birden fazla harf yerleştiriliyorsa)
        if (placedIndexes.length > 1) {
            placedIndexes.sort((a, b) => a - b);
            if (isHorizontal) {
                for (let i = 0; i < placedIndexes.length - 1; i++) {
                    if (placedIndexes[i + 1] !== placedIndexes[i] + 1 && word[placedIndexes[i] + 1] === '') {
                        Alert.alert('Hata', 'Yerleştirilen harfler arasında boşluk olmamalıdır.');
                        return false;
                    }
                }
            } else if (isVertical) {
                for (let i = 0; i < placedIndexes.length - 1; i++) {
                    if (placedIndexes[i + 1] !== placedIndexes[i] + 15 && word[placedIndexes[i] + 15] === '') {
                        Alert.alert('Hata', 'Yerleştirilen harfler arasında boşluk olmamalıdır.');
                        return false;
                    }
                }
            }
        }

        return true;
    };
    const validateWord = (formedWord, placedIndexes, boardState, wordArray, history) => {
        console.log("Oluşan kelime:", formedWord);
        console.log("Yerleştirilen indeksler:", placedIndexes);

        if (!placedIndexes || !Array.isArray(placedIndexes)) {
            console.warn("HATA: placedIndexes undefined veya geçersiz!");
            return false;
        }

        if (!wordArray || !Array.isArray(wordArray)) {
            console.warn("HATA: Kelime listesi geçerli değil!");
            console.log("wordArray değeri:", wordArray);
            return false;
        }

        // "ı" karakterlerini "i" olarak değiştir
        const normalizedWord = formedWord.toLowerCase().trim().replace(/ı/g, 'i');
        console.log("Normalize edilmiş formedWord:", normalizedWord);

        const lowerCasedWordArray = wordArray.map(w => w.toLowerCase().trim().replace(/ı/g, 'i'));
        console.log("Sözlük içinde mi?:", lowerCasedWordArray.includes(normalizedWord));

        placedIndexes.sort((a, b) => a - b);
        const isHorizontal = placedIndexes.every(index => Math.floor(index / 15) === Math.floor(placedIndexes[0] / 15));
        const isVertical = placedIndexes.every(index => index % 15 === placedIndexes[0] % 15);
        console.log("Kelime yatay mı?:", isHorizontal);
        console.log("Kelime dikey mi?:", isVertical);

        if (!isHorizontal && !isVertical) {
            Alert.alert('Kelime Yönü', 'Kelime yatay veya dikey olmalıdır!');
            return false;
        }

        const isConnected = isWordConnected(placedIndexes, boardState);
        console.log("Kelimenin bağlantısı doğru mu?:", isConnected);

        if (history.length > 0 && !isConnected) {
            Alert.alert('Bağlantısız Kelime', 'Kelime tahtadaki diğer harflerle bağlantılı olmalı!');
            return false;
        }

        if (history.length === 0 && !placedIndexes.includes(112)) {
            Alert.alert('İlk Kelime Kuralı', 'İlk kelime orta kareye (ortadaki kutu) değmelidir!');
            return false;
        }

        return lowerCasedWordArray.includes(normalizedWord);
    };
    const handleNextTurn = () => {
        const yeniYerlestirilenler = history.filter(
            (move) => move.player === currentPlayer && !move.cleared
        );

        if (yeniYerlestirilenler.length === 0) {
            Alert.alert('Uyarı', 'Lütfen tahtaya harf yerleştirin!');
            return;
        }

        const placedIndexes = yeniYerlestirilenler.map(move => move.index);

        const isFirstOverallMove = history.filter(h => h.cleared).length === 0;
        if (isFirstOverallMove && !placedIndexes.includes(112)) {
            Alert.alert('İlk Hamle Kuralı', 'İlk kelime ortadaki yeşil kutuya değmelidir.');

            const updatedBoard = [...word];
            const updatedPlayerLetters = [...playerLetters];
            const temizlenmisHistory = history.filter(h => h.cleared || h.player !== currentPlayer);

            yeniYerlestirilenler.forEach(({ index, letter }) => {
                updatedBoard[index] = '';
                updatedPlayerLetters[currentPlayer].push(letter);
            });

            setWord(updatedBoard);
            setPlayerLetters(updatedPlayerLetters);
            setHistory(temizlenmisHistory);
            return;
        }

        if (!validateWordPlacement(placedIndexes)) return;

        const allFormedWords = getAllFormedWords(placedIndexes);
        const areAllWordsValid = allFormedWords.every(wordObj =>
            validateSingleWord(wordObj.word)
        );

        if (areAllWordsValid) {
            let totalScore = 0;
            allFormedWords.forEach(wordObj => {
                totalScore += calculateScoreForWord(wordObj.word, wordObj.indexes);
            });
            // Geçersiz kutu indekslerini topla
            const gecersizIndeksler = allFormedWords
                .filter(w => !validateSingleWord(w.word))
                .flatMap(w => w.indexes);

            setGecersizIndexes(gecersizIndeksler);

            const updatedBoard = [...word];
            yeniYerlestirilenler.forEach(move => {
                updatedBoard[move.index] = move.letter;
            });
            setWord(updatedBoard);

            setPlayers(prev =>
                prev.map((p, i) =>
                    i === currentPlayer ? { ...p, score: p.score + totalScore } : p
                )
            );

            // ✅ Elindeki harfleri aynen KORU, sadece kullandığı kadar yeni harf ekle
            const kullanilanHarfSayisi = yeniYerlestirilenler.length;
            const currentLetters = [...playerLetters[currentPlayer]];
            const yeniCekilenHarfler = generateNewLetters(kullanilanHarfSayisi);
            const guncellenmisHarfler = [...currentLetters, ...yeniCekilenHarfler];

            setPlayerLetters(prev =>
                prev.map((letters, i) =>
                    i === currentPlayer ? guncellenmisHarfler : letters
                )
            );

            // ✅ Hamleyi cleared olarak işaretle
            setHistory(prev =>
                prev.map(m =>
                    m.player === currentPlayer && placedIndexes.includes(m.index)
                        ? { ...m, cleared: true }
                        : m
                )
            );

            const next = currentPlayer === 0 ? 1 : 0;
            setCurrentPlayer(next);
            guncelleKalanHarfSayisi();

            Alert.alert('Hamle Kabul Edildi', `Toplam ${totalScore} puan aldınız. Sıra ${players[next].name}'da.`);
        } else {
            const gecersiz = allFormedWords
                .filter(w => !validateSingleWord(w.word))
                .map(w => w.word)
                .join(', ');

            Alert.alert('Geçersiz Kelime', `Geçersiz: ${gecersiz}`, [
                {
                    text: 'Tamam',
                    onPress: () => {
                        const updatedBoard = [...word];
                        const updatedPlayerLetters = [...playerLetters];
                        const temizlenmisHistory = history.filter(h => h.cleared || h.player !== currentPlayer);

                        yeniYerlestirilenler.forEach(({ index, letter }) => {
                            updatedBoard[index] = '';
                            updatedPlayerLetters[currentPlayer].push(letter);
                        });

                        setWord(updatedBoard);
                        setPlayerLetters(updatedPlayerLetters);
                        setHistory(temizlenmisHistory);
                    }
                }
            ]);
        }
    };
    const guncelleKalanHarfSayisi = () => {
        const toplamKalan = harfTorbasıRef.current.length;
        setKalanHarfSayisiMetni(`${toplamKalan} harf kaldı`);
    };

    // Belirli indekslerdeki harflerden kelime oluşturur
    const formWordFromIndexes = (indexes) => {
        return indexes.map(index => word[index]).join('').toLowerCase().trim();
    };
    // Tek bir kelimeyi sözlükte kontrol eder (ı -> i dönüşümü ile)
    const validateSingleWord = (formedWord) => {
        if (!formedWord) {
            console.warn("validateSingleWord: formedWord is undefined!");
            return false;
        }
        const normalizedWord = formedWord.toLowerCase().trim().replace(/ı/g, 'i');
        const lowerCasedWordArray = wordArray.map(w => w.toLowerCase().trim().replace(/ı/g, 'i'));
        return lowerCasedWordArray.includes(normalizedWord) && normalizedWord.length > 1;
    };
    // Yeni yerleştirilen harflerle oluşan tüm yatay ve dikey kelimeleri bulur
    const getAllFormedWords = (placedIndexes) => {
        const formedWords = [];
        const rowSize = 15;

        placedIndexes.forEach(index => {
            const row = Math.floor(index / rowSize);
            const col = index % rowSize;

            // Yatay kelimeyi bul
            let startH = col;
            while (startH > 0 && word[row * rowSize + startH - 1] !== '') {
                startH--;
            }
            let endH = col;
            while (endH < rowSize - 1 && word[row * rowSize + endH + 1] !== '') {
                endH++;
            }
            if (endH - startH + 1 > 1) {
                const horizontalWord = [];
                const horizontalIndexes = [];
                for (let i = startH; i <= endH; i++) {
                    const currentLetterIndex = row * rowSize + i;
                    horizontalWord.push(word[currentLetterIndex]);
                    horizontalIndexes.push(currentLetterIndex);
                }
                formedWords.push({ word: horizontalWord.join(''), indexes: horizontalIndexes });
            }
            // Dikey kelimeyi bul
            let startV = row;
            while (startV > 0 && word[(startV - 1) * rowSize + col] !== '') {
                startV--;
            }
            let endV = row;
            while (endV < rowSize - 1 && word[(endV + 1) * rowSize + col] !== '') {
                endV++;
            }
            if (endV - startV + 1 > 1) {
                const verticalWord = [];
                const verticalIndexes = [];
                for (let i = startV; i <= endV; i++) {
                    const currentLetterIndex = i * rowSize + col;
                    verticalWord.push(word[currentLetterIndex]);
                    verticalIndexes.push(currentLetterIndex);
                }
                formedWords.push({ word: verticalWord.join(''), indexes: verticalIndexes });
            }
        });
        // Ana kelimeyi de ekleyelim (eğer birden fazla harf yerleştirildiyse)
        if (placedIndexes.length > 1) {
            const isHorizontal = placedIndexes.every(idx => Math.floor(idx / rowSize) === Math.floor(placedIndexes[0] / rowSize));
            const isVertical = placedIndexes.every(idx => idx % rowSize === placedIndexes[0] % rowSize);

            if (isHorizontal) {
                placedIndexes.sort((a, b) => a - b);
                let start = placedIndexes[0];
                while (start > 0 && word[start - 1] !== '' && Math.floor((start - 1) / rowSize) === Math.floor(placedIndexes[0] / rowSize)) start--;
                let end = placedIndexes[placedIndexes.length - 1];
                while (end < rowSize * rowSize - 1 && word[end + 1] !== '' && Math.floor((end + 1) / rowSize) === Math.floor(placedIndexes[0] / rowSize)) end++;
                if (end - start + 1 > 1) {
                    const mainHorizontalWord = [];
                    const mainHorizontalIndexes = [];
                    for (let i = start; i <= end; i++) {
                        mainHorizontalWord.push(word[i]);
                        mainHorizontalIndexes.push(i);
                    }
                    formedWords.push({ word: mainHorizontalWord.join(''), indexes: mainHorizontalIndexes });
                }
            } else if (isVertical) {
                placedIndexes.sort((a, b) => a - b);
                let start = placedIndexes[0];
                while (start >= rowSize && word[start - rowSize] !== '' && (start - rowSize) % rowSize === placedIndexes[0] % rowSize) start -= rowSize;
                let end = placedIndexes[placedIndexes.length - 1];
                while (end < rowSize * rowSize - rowSize && word[end + rowSize] !== '' && (end + rowSize) % rowSize === placedIndexes[0] % rowSize) end += rowSize;
                if ((end - start) / rowSize + 1 > 1) {
                    const mainVerticalWord = [];
                    const mainVerticalIndexes = [];
                    for (let i = start; i <= end; i += rowSize) {
                        mainVerticalWord.push(word[i]);
                        mainVerticalIndexes.push(i);
                    }
                    formedWords.push({ word: mainVerticalWord.join(''), indexes: mainVerticalIndexes });
                }
            }
        }
        // Aynı kelimelerin tekrarını önlemek için benzersiz olanları filtreleyelim (isteğe bağlı)
        const uniqueWords = [];
        const seenWords = new Set();
        formedWords.forEach(item => {
            const key = item.word + '-' + item.indexes.sort().join(',');
            if (!seenWords.has(key)) {
                uniqueWords.push(item);
                seenWords.add(key);
            }
        });
        return uniqueWords;
    };

    const handleSelectLetterToChange = (index) => {
        if (selectedLettersToChange.includes(index)) {
            setSelectedLettersToChange(selectedLettersToChange.filter(i => i !== index));
        } else {
            setSelectedLettersToChange([...selectedLettersToChange, index]);
        }
    };

    const handleChangeSelectedLetters = () => {
        if (selectedLettersToChange.length > 0) {
            let newPlayerLetters = [...playerLetters];
            let currentPlayerLetters = [...newPlayerLetters[currentPlayer]];
            let lettersToAddToBag = [];

            const sortedIndices = [...selectedLettersToChange].sort((a, b) => b - a);
            sortedIndices.forEach(index => {
                lettersToAddToBag.push(currentPlayerLetters.splice(index, 1)[0].toUpperCase());
            });

            const newLettersFromBag = generateNewLetters(selectedLettersToChange.length);
            if (newLettersFromBag) {
                currentPlayerLetters.push(...newLettersFromBag);
                newPlayerLetters[currentPlayer] = currentPlayerLetters.sort(() => Math.random() - 0.5);

                setPlayerLetters(newPlayerLetters);
                setChangeLettersModalVisible(false);
                setSelectedLettersToChange([]);
                guncelleKalanHarfSayisi(); // Harf değiştirildikten sonra kalan harf sayısını güncelle

                const nextPlayer = currentPlayer === 0 ? 1 : 0;
                setCurrentPlayer(nextPlayer);
                Alert.alert('Harfler Değiştirildi', `Harfler değiştirildi. Sıra ${players[nextPlayer].name}'da.`);
                harfTorbasıRef.current.push(...lettersToAddToBag);

            } else {
                Alert.alert('Uyarı', 'Torba boş, harf değiştirilemiyor!');
                setChangeLettersModalVisible(false);
                setSelectedLettersToChange([]);
            }
        }
    };

    const calculateScoreForWord = (formedWord, indexes) => {
        let totalScore = 0;
        let wordMultiplier = 1;
        const letterMultipliers = {};

        indexes.forEach(index => {
            const letter = formedWord[indexes.indexOf(index)]; // Kelimedeki doğru sıradaki harfi al
            const baseScore = harfPuaniniGetir(letter.toUpperCase()) || 0;
            let letterMultiplier = 1;
            const bonus = getBonusType(index);
            if (bonus) {
                if (bonus.type === 'letter') {
                    letterMultiplier = bonus.multiplier;
                    letterMultipliers[index] = bonus.multiplier;
                } else if (bonus.type === 'word') {
                    wordMultiplier *= bonus.multiplier;
                }
            }
            totalScore += baseScore * letterMultiplier;
        });

        return totalScore * wordMultiplier;
    };
    const calculateScore = (indexes) => {
        let totalScore = 0;
        let wordMultiplier = 1;
        const letterMultipliers = {};

        indexes.forEach(index => {
            const letter = word[index];
            const baseScore = harfPuaniniGetir(letter.toUpperCase()) || 0;
            let letterMultiplier = 1;
            const bonus = getBonusType(index);
            if (bonus) {
                if (bonus.type === 'letter') {
                    letterMultiplier = bonus.multiplier;
                    letterMultipliers[index] = bonus.multiplier;
                } else if (bonus.type === 'word') {
                    wordMultiplier *= bonus.multiplier;
                }
            }
            totalScore += baseScore * letterMultiplier;
        });

        return totalScore * wordMultiplier;
    };
    const handleJokerLetterSelect = (selectedLetter) => {
        if (jokerTargetIndex !== null) {
            updateWordBox(jokerTargetIndex, selectedLetter.toUpperCase());

            setHistory((prevHistory) => [...prevHistory, {
                index: jokerTargetIndex,
                letter: 'JOKER', // orijinal taşın ne olduğunu biliyoruz
                realLetter: selectedLetter.toUpperCase(), // gerçek harf
                player: currentPlayer,
                cleared: false
            }]);

            setPlayerLetters((prevLetters) => {
                const newLetters = [...prevLetters[currentPlayer]];
                const index = newLetters.indexOf('JOKER');
                if (index !== -1) {
                    newLetters.splice(index, 1);
                }
                return prevLetters.map((playerLetters, playerIndex) =>
                    playerIndex === currentPlayer ? newLetters : playerLetters
                );
            });

            // Modal kapat
            setJokerModalVisible(false);
            setJokerTargetIndex(null);
            setJokerPendingLetter(null);
        }
    };
    const handleDrop = (letter, event) => {
        const { absoluteX, absoluteY } = event.nativeEvent;

        for (let i = 0; i < boxRefs.current.length; i++) {
            if (boxRefs.current[i]) {
                boxRefs.current[i].measure((_, __, width, height, pageX, pageY) => {
                    const isInside =
                        absoluteX >= pageX && absoluteX <= pageX + width &&
                        absoluteY >= pageY && absoluteY <= pageY + height;

                    if (isInside) {
                        if (word[i] === '') {
                            // Arka planı değiştirme, sadece geçici harf yerleştir
                            setBonusKullanim(prev => ({ ...prev, [i]: true }));

                            if (letter.toUpperCase() === 'JOKER') {
                                setJokerTargetIndex(i);
                                setJokerModalVisible(true);
                            } else {
                                updateWordBox(i, letter.toUpperCase());

                                // Geçici hamle olarak history'e ekle
                                setHistory(prev => [
                                    ...prev,
                                    {
                                        index: i,
                                        letter: letter.toUpperCase(),
                                        player: currentPlayer,
                                        cleared: false
                                    }
                                ]);

                                // Oyuncunun elindeki harfleri geçici azalt (tek kopyayı sil)
                                setPlayerLetters(prev =>
                                    prev.map((playerLetters, playerIndex) =>
                                        playerIndex === currentPlayer
                                            ? (() => {
                                                const newLetters = [...playerLetters];
                                                const index = newLetters.indexOf(letter);
                                                if (index !== -1) newLetters.splice(index, 1); // sadece 1 tane sil
                                                return newLetters;
                                            })()
                                            : playerLetters
                                    )
                                );
                            }
                        } else {
                            Alert.alert('Uyarı', 'Bu kutu zaten dolu!');
                        }
                    }
                });
            }
        }

        // Harfi eski yerine geri döndür
        dragX.value = withTiming(0);
        dragY.value = withTiming(0);
    };


    const updatePlayerLetters = (letter) => {
        setPlayerLetters(prevLetters => {
            const newLetters = [...prevLetters[currentPlayer]];
            const index = newLetters.indexOf(letter);

            if (index !== -1) {
                newLetters.splice(index, 1);
            }

            return prevLetters.map((playerLetters, playerIndex) =>
                playerIndex === currentPlayer ? newLetters : playerLetters
            );
        });
    };
    const updateWordBox = (index, letter) => {
        const updatedWord = [...word];
        updatedWord[index] = letter;
        setWord(updatedWord);
    };

    const handleUndo = () => {
        const lastMoveIndex = history.findLastIndex(
            (move) => move.player === currentPlayer && !move.cleared
        );

        if (lastMoveIndex !== -1) {
            const lastMove = history[lastMoveIndex];
            removeLetterFromBoard(lastMove);
            setHistory(prevHistory => prevHistory.slice(0, lastMoveIndex));
        } else {
            Alert.alert('Uyarı', 'Geri alınacak hamle yok!');
        }
    };
    const removeLetterFromBoard = (lastMove) => {
        setWord(prevWord => {
            const updatedWord = [...prevWord];
            updatedWord[lastMove.index] = '';
            return updatedWord;
        });

        setPlayerLetters(prevLetters => {
            const updatedLetters = [...prevLetters];
            updatedLetters[currentPlayer].push(lastMove.letter);
            return updatedLetters;
        });
    };

    const shuffleLetters = () => {
        setPlayerLetters(prevLetters => {
            const updatedLetters = prevLetters.map((letters, index) =>
                index === currentPlayer ? [...letters].sort(() => Math.random() - 0.5) : letters
            );
            return updatedLetters;
        });
    };
    const handleSurrender = () => {
        Alert.alert(
            'Teslim Ol',
            'Gerçekten teslim olmak istiyor musun?',
            [
                {
                    text: 'İptal',
                    style: 'cancel',
                },
                {
                    text: 'Evet',
                    onPress: () => BackHandler.exitApp(),
                },
            ],
            { cancelable: false }
        );
    };
    const handlePass = () => {
        const nextPlayer = currentPlayer === 0 ? 1 : 0;

        Alert.alert(
            'Pas Geçildi',
            `Hamlenizi pas geçtiniz.\nSıra ${players[nextPlayer].name}'da.`,
            [
                {
                    text: 'Tamam',
                    onPress: () => {
                        setCurrentPlayer(nextPlayer);
                    }
                }
            ]
        );
    };
    const kalanHarfSayisi = () => {
        return harfTorbasıRef.current.reduce((acc, harf) => {
            acc[harf] = (acc[harf] || 0) + 1;
            return acc;
        }, {});
    };
    const handleJokerSelect = (selectedLetter) => {
        const { index, player } = jokerPlacement;

        const updatedBoard = [...word];
        updatedBoard[index] = selectedLetter;
        setWord(updatedBoard);

        setHistory(prev => [
            ...prev,
            {
                index,
                letter: 'JOKER',
                realLetter: selectedLetter,
                player,
                cleared: false
            }
        ]);

        // Elinden sadece bir JOKER taşını kaldır
        setPlayerLetters(prev =>
            prev.map((letters, i) =>
                i === player
                    ? (() => {
                        const copy = [...letters];
                        const idx = copy.indexOf('JOKER');
                        if (idx !== -1) copy.splice(idx, 1);
                        return copy;
                    })()
                    : letters
            )
        );

        setJokerModalVisible(false);
        setJokerPlacement(null);
    };

    const baslangicHarfDagilimi = harfDagilimi;
    const kalanHarfler = kalanHarfSayisi();

    const harfDurumuVerisi = Object.keys(baslangicHarfDagilimi).map(harf => ({
        harf,
        baslangic: baslangicHarfDagilimi[harf].adet,
        kalan: kalanHarfler[harf] || 0
    }));
    const JokerHarfSecimiModal = ({ visible, onSelectLetter, onClose }) => {
        const alfabe = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'.split('');

        return (
            <Modal visible={visible} transparent animationType="slide">
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>JOKER HARF SEÇİMİ</Text>
                        <FlatList
                            data={alfabe}
                            numColumns={6}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.letterBox}
                                    onPress={() => onSelectLetter(item)}
                                >
                                    <Text style={styles.letterText}>{item}</Text>
                                    <Text style={styles.letterPoint}>0</Text>
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeButtonText}>Kapat</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    };
    {
        suruklenenHarf && (
            <Animated.View
                style={{
                    position: 'absolute',
                    top: parmakPozisyonu.y - 30,
                    left: parmakPozisyonu.x - 30,
                    zIndex: 1000,
                    backgroundColor: 'white',
                    padding: 10,
                    borderRadius: 10,
                    elevation: 10,
                }}
            >
                <Text style={{ fontSize: 32, fontWeight: 'bold' }}>{suruklenenHarf}</Text>
            </Animated.View>
        )
    }

    <Modal visible={jokerModalVisible} transparent animationType="slide">
        <View style={styles.centeredView}>
            <View style={styles.modalView}>
                <Text style={styles.modalTitle}>JOKER Harfi Seçin</Text>
                <FlatList
                    data={alfabeArray}
                    numColumns={6}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.letterBox}
                            onPress={() => handleJokerSelect(item)}
                        >
                            <Text style={styles.letterText}>{item}</Text>
                        </TouchableOpacity>
                    )}
                />
            </View>
        </View>
    </Modal>

    const JokerModal = ({ visible, onClose, onSelectLetter }) => {
        const alphabet = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'.split('');
        <JokerModal
            visible={jokerModalVisible}
            onClose={() => setJokerModalVisible(false)}
            onSelectLetter={handleJokerLetterSelect}
        />

        return (
            <Modal
                animationType="slide"
                transparent={true}
                visible={visible}
                onRequestClose={onClose}
            >
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>JOKER HARF SEÇ</Text>
                        <FlatList
                            data={alphabet}
                            numColumns={6}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.letterBox}
                                    onPress={() => onSelectLetter(item)}
                                >
                                    <Text style={styles.letterText}>{item}</Text>
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                            <Text style={styles.buttonText}>Vazgeç</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    };

    const HarfDegistirModal = ({
        visible,
        onClose,
        playerLetters,
        selectedLettersToChange,
        setSelectedLettersToChange,
        onConfirmChange
    }) => {
        const toggleLetter = (letter, index) => {
            const key = `${letter}-${index}`;
            if (selectedLettersToChange.includes(key)) {
                setSelectedLettersToChange(selectedLettersToChange.filter(item => item !== key));
            } else {
                setSelectedLettersToChange([...selectedLettersToChange, key]);
            }
        };

        return (
            <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
                <View style={styles.centeredView}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>HARF DEĞİŞTİR</Text>
                        <Text style={styles.modalInfo}>
                            Harf değişimi yaptığınızda oyun sırası karşı tarafa geçecektir.
                        </Text>
                        <Text style={styles.modalSubInfo}>Değiştirmek istediğiniz harfleri seçin.</Text>

                        <View style={styles.letterGrid}>
                            {playerLetters.map((letter, index) => {
                                const key = `${letter}-${index}`;
                                const selected = selectedLettersToChange.includes(key);
                                return (
                                    <TouchableOpacity
                                        key={key}
                                        style={[styles.letterBox, selected && styles.selectedLetterBox]}
                                        onPress={() => toggleLetter(letter, index)}
                                    >
                                        <Text style={styles.letterText}>{letter}</Text>
                                        <Text style={styles.letterScore}>{harfPuaniniGetir(letter)}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View style={styles.modalButtonRow}>
                            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                                <Text style={styles.buttonText}>Vazgeç</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmButton} onPress={onConfirmChange}>
                                <Text style={styles.buttonText}>Değiştir</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    const HarfDurumuModal = ({ visible, onClose, harfDurumuVerisi }) => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>HARF Tablosu</Text>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Text style={styles.closeButtonText}>X</Text>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={harfDurumuVerisi}
                        keyExtractor={(item) => item.harf}
                        renderItem={({ item }) => (
                            <View style={styles.harfDurumuSatiri}>
                                <Text style={styles.harf}>{item.harf}</Text>
                                <Text style={styles.adet}>
                                    {item.baslangic}/{item.baslangic - item.kalan}
                                </Text>
                            </View>
                        )}
                        numColumns={6}
                    />
                </View>
            </View>
        </Modal>
    );
    return (
        <GestureHandlerRootView style={styles.container}>
            <View style={styles.board}>
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 10 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', marginRight: 100 }}>
                        {players[0].name} Skor: {players[0].score}
                    </Text>

                    <Text style={{ fontSize: 18, fontWeight: 'bold', marginLeft: 100 }}>
                        {players[1].name} Skor: {players[1].score}
                    </Text>
                </View>

                {/* Oyun Tahtası */}
                <View style={styles.wordBoard}>
                    {word.map((letter, index) => {
                        const bonus = isBonusCell(index) ? getBonusType(index) : null;
                        return (
                            <View
                                key={index}
                                ref={(ref) => (boxRefs.current[index] = ref)}
                                style={[
                                    styles.wordBox,
                                    bonusStyle(bonus),
                                    index === 112 && styles.ortaKutu, // Orta kutuya özel stil
                                ]}
                            >{bonus && !bonusKullanim[index] && (
                                <Text style={styles.bonusText}>
                                    {bonus.type === 'word' ? `K${bonus.multiplier}` : `H${bonus.multiplier}`}
                                </Text>
                            )}

                                <Text style={styles.boxText}>{letter}</Text>
                            </View>
                        );
                    })}
                </View>
            </View>

            {/* Oyuncu Harfleri */}
            <View style={styles.playerLettersContainer}>
                <FlatList
                    data={playerLetters[currentPlayer]}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item, index }) => (
                        <PanGestureHandler
                            onGestureEvent={(event) => {
                                dragX.value = event.translationX;
                                dragY.value = event.translationY;
                            }}
                            onEnded={(event) => {
                                handleDrop(item, event);
                            }}
                        >
                            <Animated.View
                                style={[styles.playerLetterBox, animatedStyle, { zIndex: 10 }]}
                            >
                                <Text style={styles.playerLetterText}>
                                    {item === 'JOKER' ? '' : item}
                                </Text>

                                <Text style={styles.playerLetterScore}>{harfPuaniniGetir(item)}</Text>
                            </Animated.View>
                        </PanGestureHandler>
                    )}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                />
            </View>

            {/* Oyun Butonları */}
            <View style={styles.scoreBoard}>
                {/* Tamam Butonu */}
                <View style={styles.iconWrapper}>
                    <TouchableOpacity style={styles.okButton} onPress={handleNextTurn}>
                        <Image
                            source={require('./assets/images/play.png')}
                            style={styles.iconImage}
                            resizeMode="contain"
                        />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity
                    style={[styles.actionButton, styles.undoButton]}
                    onPress={handleUndo}
                    disabled={history.length === 0 || currentPlayer !== history[history.length - 1]?.player}
                >
                    <View style={styles.iconWrapper}>
                        <Image
                            source={require('./assets/images/undo.png')}
                            style={styles.undoImage}
                            resizeMode="contain"
                        />
                        <Text style={styles.undoButtonText}>Geri Al</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shuffleButton} onPress={shuffleLetters}>
                    <Image
                        source={require('./assets/images/shuffle.png')}
                        style={styles.shuffleIcon}
                        resizeMode="contain"
                    />
                    <Text style={styles.shuffleButtonText}>Karıştır</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.moreActionsButton]}
                    onPress={() => setIsActionsMenuVisible(!isActionsMenuVisible)}
                >
                    <Text style={styles.moreActionsButtonText}>⋮</Text>
                </TouchableOpacity>


                {/* Açılır Aksiyon Menüsü */}
                {isActionsMenuVisible && (
                    <View style={styles.actionsMenu}>

                        <TouchableOpacity
                            style={[styles.actionMenuItem, styles.passMenuItem]}
                            onPress={handlePass}
                        >
                            <Text style={styles.actionMenuItemText}>Pas Geç</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionMenuItem, styles.surrenderMenuItem]}
                            onPress={() => {
                                handleSurrender();
                                setIsActionsMenuVisible(false); // Menü kapatma
                            }}
                        >
                            <Text style={styles.actionMenuItemText}>Teslim Ol</Text>
                        </TouchableOpacity>


                        <TouchableOpacity
                            style={[styles.actionMenuItem, styles.changeLettersMenuItem]}
                            onPress={() => setChangeLettersModalVisible(true)}
                        >
                            <Text style={styles.actionMenuItemText}>Harf Değiştir</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Harf Durumu Modalı */}
            <HarfDurumuModal
                visible={isHarfDurumuVisible}
                onClose={() => setIsHarfDurumuVisible(false)}
                harfDurumuVerisi={harfDurumuVerisi} />
        </GestureHandlerRootView>
    );
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f6e5d5',
    },
    board: {
        alignItems: 'center',
        padding: 20,
    },
    boardText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginHorizontal: 5,
    },
    wordBoard: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: width * 0.9,
        height: width * 0.9,
        marginBottom: -25,
    },
    wordBox: {
        width: (width * 0.9) / 15,
        height: (width * 0.9) / 15,
        borderWidth: 1,
        borderColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
    },
    boxText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    ortaKutu: {
        backgroundColor: 'lightgreen',
    },
    bonusText: {
        position: 'absolute',
        top: 8,
        left: 8,
        fontSize: 13,
        fontWeight: 'bold',
        color: 'white',
    },
    playerLettersContainer: {
        marginBottom: 30,
        height: 70,
        bottom: -40,
    },
    playerLetterBox: {
        width: 70,
        height: 70,
        backgroundColor: '#ffba00',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 5,
        position: 'relative',
    },
    playerLetterText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    playerLetterScore: {
        fontSize: 10,
        position: 'absolute',
        top: 2,
        right: 2,
        color: '#555',
    },
    actionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: 20,
    },
    actionButton: {
        backgroundColor: '#007bff',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 5,
        marginHorizontal: 5,
        marginVertical: 5,
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },

    modalView: {
        margin: 20, // Optional: Adds some margin around the modal content
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 35,
        alignItems: 'center', // If you want content inside the modal to be centered
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    scoreContainer: {
        position: 'absolute',
        bottom: 70,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        backgroundColor: '#f8f8f8',
        borderBottomWidth: 1,
        borderColor: '#ccc',
    },
    scoreText: {
        fontSize: 16,
        color: '#333',
    },
    scoreTextContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-around',
        zIndex: 10,
    },
    scorePlainText: {
        fontSize: 16,
        color: '#000',
    },
    activePlayerText: {
        fontWeight: 'bold',
        color: '#007bff',
        textDecorationLine: 'underline',
    },
    kalanHarfText: {
        fontSize: 14,
        color: '#666',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: 15,
    },
    closeButton: {
        backgroundColor: '#dc3545',
        borderRadius: 5,
        padding: 8,
    },
    closeButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    harfDurumuSatiri: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: 50,
        marginVertical: 2,
    },
    harf: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    adet: {
        fontSize: 12,
        color: '#666',
    },
    boardLetterScore: {
        fontSize: 8, // Daha küçük bir font boyutu
        position: 'absolute',
        top: 2,
        right: 2,
        color: '#555',
    },
    moreActionsButton: {
        backgroundColor: '#42adf5',
        padding: 10,
        borderRadius: 8,
        position: 'absolute',
        bottom: 50,
        right: -105,
        width: 77,
        height: 93,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    moreActionsButtonText: {
        fontSize: 30,
        fontWeight: 'bold',
        color: 'white',
    },
    actionsMenu: {
        position: 'absolute',
        bottom: 15,
        right: -240,
        backgroundColor: '#082567',
        borderRadius: 5,
        paddingVertical: 10,
        marginRight: 5,
    },
    actionMenuItem: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderColor: '#444',
    },
    actionMenuItemText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    passMenuItem: {
        backgroundColor: '#007bff', // Mavi renk
    },
    surrenderMenuItem: {
        backgroundColor: '#dc3545', // Kırmızı renk
    },
    changeLettersMenuItem: {
        backgroundColor: '#28a745', // Yeşil renk
    },
    fullScreenOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent', // Tamamen görünmez
        justifyContent: 'flex-end', // Menüyü alt kısma hizalar
        alignItems: 'flex-end', // Menüyü sağ kısma hizalar
        paddingRight: 5, // Menünün sağ kenardan biraz içeride olması için
        paddingBottom: 140, // Menünün alt kenardan biraz yukarıda olması için (actionsContainer yüksekliğine göre ayarlanabilir)
    },
    actionButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#FF3B30',
        marginHorizontal: 5,
    },
    actionButtonText: {
        color: '#1c1c1c',
        fontSize: 15,
        fontWeight: '800',
        textAlign: 'center',
    },
    undoButton: {
        backgroundColor: '#42adf5',
        padding: 20,
        bottom: 55,
        right: 90,
        height: 90,
    },
    iconWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    undoImage: {
        width: 30,
        height: 30,
        marginBottom: 4,
    },
    undoButtonText: {
        color: '#1c1c1c',
        fontSize: 17,
        fontWeight: '800',
        textAlign: 'center',
    },
    shuffleButton: {
        backgroundColor: '#42adf5',
        padding: 17,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute', // absolute konumlandırma kullanacağız
        bottom: 50,         // Alttan olan mesafesi (ayarlanabilir)
        right: -10,          // Sağa olan mesafeyi ayarlayın (pozitif değer sağa kaydırır)
    },
    shuffleIcon: {
        width: 46,
        height: 46,
        position: 'absolute',
        top: 5,
        left: '70%',
        marginLeft: -15,
        marginTop: -5,
    },
    shuffleButtonText: {
        color: '#1c1c1c',
        fontSize: 17,
        fontWeight: 'bold',
        textAlign: 'center',
        paddingTop: 35,
    },
    okButton: {
        flexDirection: 'row', // Yatayda hizalamak için
        alignItems: 'center', // İçindeki öğeleri dikeyde ortalamak için
        padding: 30,
        backgroundColor: '#28a745',
        borderRadius: 15,
        marginTop: 10,
        bottom: -30,
        left: -220,
    },
    okButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    iconImage: {
        width: 50,
        height: 50,
    },
    modalChangeButton: {
        backgroundColor: '#4CAF50',
    },
    modalChangeText: {
        color: 'white',
        fontWeight: 'bold',
    },
    changeableLettersContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: 10,
    },
    changeableLetterButton: {
        width: 50,
        height: 50,
        backgroundColor: '#FFFACD',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        margin: 5,
        borderWidth: 1,
        borderColor: '#EEE8AA',
    },
    changeableLetterText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    selectedChangeableLetter: {
        borderColor: '#FF4500',
        borderWidth: 3,
    },
    changeableLetterScore: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        fontSize: 10,
        color: '#777',
    },
    letterGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: 20,
    },
    letterBox: {
        backgroundColor: '#FFEB3B',
        width: 45,
        height: 55,
        margin: 5,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
    },
    selectedLetterBox: {
        backgroundColor: '#FFD700',
        borderColor: '#f39c12',
        borderWidth: 2,
    },
    letterText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    letterScore: {
        fontSize: 12,
        color: '#444',
    },
    modalButtonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    cancelButton: {
        backgroundColor: '#bdc3c7',
        padding: 10,
        borderRadius: 8,
        flex: 1,
        marginRight: 10,
        alignItems: 'center',
    },
    confirmButton: {
        backgroundColor: '#0077B6',
        padding: 10,
        borderRadius: 8,
        flex: 1,
        marginLeft: 10,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#004c6d',
    },
    letterBox: {
        width: 45,
        height: 45,
        backgroundColor: '#f1c40f',
        justifyContent: 'center',
        alignItems: 'center',
        margin: 5,
        borderRadius: 5,
        position: 'relative',
    },
    letterText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#5d3a00',
    },
    letterPoint: {
        position: 'absolute',
        top: 2,
        right: 4,
        fontSize: 10,
        color: 'red',
        fontWeight: 'bold',
    },
    closeButton: {
        marginTop: 15,
        backgroundColor: '#2980b9',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 5,
    },
    closeButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
});
export default App;