-- ====================================================================
-- SQL Script to SAFELY Insert All Indian States and Districts - PART 2
-- ====================================================================
-- Run this AFTER running the SAFE Part 1 script
-- Uses MERGE to avoid conflicts with existing data
-- Safe to run multiple times
-- ====================================================================

USE [VASANTHAMDB];
GO

PRINT 'Continuing SAFE insertion of Districts - Part 2...';
GO

-- ====================================================================
-- Merge Remaining Districts (380-775)
-- ====================================================================

MERGE INTO District_Master AS target
USING (VALUES
    -- Maharashtra (380-415)
    (380, 'Ahmednagar', 15), (381, 'Akola', 15), (382, 'Amravati', 15), (383, 'Aurangabad', 15),
    (384, 'Beed', 15), (385, 'Bhandara', 15), (386, 'Buldhana', 15), (387, 'Chandrapur', 15),
    (388, 'Dhule', 15), (389, 'Gadchiroli', 15), (390, 'Gondia', 15), (391, 'Hingoli', 15),
    (392, 'Jalgaon', 15), (393, 'Jalna', 15), (394, 'Kolhapur', 15), (395, 'Latur', 15),
    (396, 'Mumbai City', 15), (397, 'Mumbai Suburban', 15), (398, 'Nagpur', 15), (399, 'Nanded', 15),
    (400, 'Nandurbar', 15), (401, 'Nashik', 15), (402, 'Osmanabad', 15), (403, 'Palghar', 15),
    (404, 'Parbhani', 15), (405, 'Pune', 15), (406, 'Raigad', 15), (407, 'Ratnagiri', 15),
    (408, 'Sangli', 15), (409, 'Satara', 15), (410, 'Sindhudurg', 15), (411, 'Solapur', 15),
    (412, 'Thane', 15), (413, 'Wardha', 15), (414, 'Washim', 15), (415, 'Yavatmal', 15),
    
    -- Manipur (416-431)
    (416, 'Bishnupur', 16), (417, 'Chandel', 16), (418, 'Churachandpur', 16), (419, 'Imphal East', 16),
    (420, 'Imphal West', 16), (421, 'Jiribam', 16), (422, 'Kakching', 16), (423, 'Kamjong', 16),
    (424, 'Kangpokpi', 16), (425, 'Noney', 16), (426, 'Pherzawl', 16), (427, 'Senapati', 16),
    (428, 'Tamenglong', 16), (429, 'Tengnoupal', 16), (430, 'Thoubal', 16), (431, 'Ukhrul', 16),
    
    -- Meghalaya (432-442)
    (432, 'East Garo Hills', 17), (433, 'East Jaintia Hills', 17), (434, 'East Khasi Hills', 17),
    (435, 'North Garo Hills', 17), (436, 'Ri Bhoi', 17), (437, 'South Garo Hills', 17),
    (438, 'South West Garo Hills', 17), (439, 'South West Khasi Hills', 17), (440, 'West Garo Hills', 17),
    (441, 'West Jaintia Hills', 17), (442, 'West Khasi Hills', 17),
    
    -- Mizoram (443-453)
    (443, 'Aizawl', 18), (444, 'Champhai', 18), (445, 'Hnahthial', 18), (446, 'Khawzawl', 18),
    (447, 'Kolasib', 18), (448, 'Lawngtlai', 18), (449, 'Lunglei', 18), (450, 'Mamit', 18),
    (451, 'Saiha', 18), (452, 'Saitual', 18), (453, 'Serchhip', 18),
    
    -- Nagaland (454-469)
    (454, 'Chumukedima', 19), (455, 'Dimapur', 19), (456, 'Kiphire', 19), (457, 'Kohima', 19),
    (458, 'Longleng', 19), (459, 'Mokokchung', 19), (460, 'Mon', 19), (461, 'Niuland', 19),
    (462, 'Noklak', 19), (463, 'Peren', 19), (464, 'Phek', 19), (465, 'Shamator', 19),
    (466, 'Tseminyü', 19), (467, 'Tuensang', 19), (468, 'Wokha', 19), (469, 'Zunheboto', 19),
    
    -- Odisha (470-499)
    (470, 'Angul', 20), (471, 'Balangir', 20), (472, 'Balasore', 20), (473, 'Bargarh', 20),
    (474, 'Bhadrak', 20), (475, 'Boudh', 20), (476, 'Cuttack', 20), (477, 'Deogarh', 20),
    (478, 'Dhenkanal', 20), (479, 'Gajapati', 20), (480, 'Ganjam', 20), (481, 'Jagatsinghpur', 20),
    (482, 'Jajpur', 20), (483, 'Jharsuguda', 20), (484, 'Kalahandi', 20), (485, 'Kandhamal', 20),
    (486, 'Kendrapara', 20), (487, 'Kendujhar', 20), (488, 'Khordha', 20), (489, 'Koraput', 20),
    (490, 'Malkangiri', 20), (491, 'Mayurbhanj', 20), (492, 'Nabarangpur', 20), (493, 'Nayagarh', 20),
    (494, 'Nuapada', 20), (495, 'Puri', 20), (496, 'Rayagada', 20), (497, 'Sambalpur', 20),
    (498, 'Subarnapur', 20), (499, 'Sundargarh', 20),
    
    -- Punjab (500-522)
    (500, 'Amritsar', 21), (501, 'Barnala', 21), (502, 'Bathinda', 21), (503, 'Faridkot', 21),
    (504, 'Fatehgarh Sahib', 21), (505, 'Fazilka', 21), (506, 'Ferozepur', 21), (507, 'Gurdaspur', 21),
    (508, 'Hoshiarpur', 21), (509, 'Jalandhar', 21), (510, 'Kapurthala', 21), (511, 'Ludhiana', 21),
    (512, 'Malerkotla', 21), (513, 'Mansa', 21), (514, 'Moga', 21), (515, 'Mohali', 21),
    (516, 'Muktsar', 21), (517, 'Pathankot', 21), (518, 'Patiala', 21), (519, 'Rupnagar', 21),
    (520, 'Sangrur', 21), (521, 'Shaheed Bhagat Singh Nagar', 21), (522, 'Tarn Taran', 21),
    
    -- Rajasthan (523-572)
    (523, 'Ajmer', 22), (524, 'Alwar', 22), (525, 'Anupgarh', 22), (526, 'Balotra', 22),
    (527, 'Banswara', 22), (528, 'Baran', 22), (529, 'Barmer', 22), (530, 'Beawar', 22),
    (531, 'Bharatpur', 22), (532, 'Bhilwara', 22), (533, 'Bikaner', 22), (534, 'Bundi', 22),
    (535, 'Chittorgarh', 22), (536, 'Churu', 22), (537, 'Dausa', 22), (538, 'Deeg', 22),
    (539, 'Dholpur', 22), (540, 'Didwana Kuchaman', 22), (541, 'Dudu', 22), (542, 'Dungarpur', 22),
    (543, 'Ganganagar', 22), (544, 'Hanumangarh', 22), (545, 'Jaipur', 22), (546, 'Jaisalmer', 22),
    (547, 'Jalore', 22), (548, 'Jhalawar', 22), (549, 'Jhunjhunu', 22), (550, 'Jodhpur', 22),
    (551, 'Karauli', 22), (552, 'Kekri', 22), (553, 'Khairthal Tijara', 22), (554, 'Kota', 22),
    (555, 'Kotputli Behror', 22), (556, 'Nagaur', 22), (557, 'Neem Ka Thana', 22), (558, 'Pali', 22),
    (559, 'Phalodi', 22), (560, 'Pratapgarh', 22), (561, 'Rajsamand', 22), (562, 'Salumbar', 22),
    (563, 'Sanchore', 22), (564, 'Sawai Madhopur', 22), (565, 'Shahpura', 22), (566, 'Sikar', 22),
    (567, 'Sirohi', 22), (568, 'Tonk', 22), (569, 'Udaipur', 22), (570, 'Jodhpur West', 22),
    (571, 'Jodhpur East', 22), (572, 'Gangapur City', 22),
    
    -- Sikkim (573-578)
    (573, 'East Sikkim', 23), (574, 'North Sikkim', 23), (575, 'Pakyong', 23),
    (576, 'Soreng', 23), (577, 'South Sikkim', 23), (578, 'West Sikkim', 23),
    
    -- Telangana (579-611)
    (579, 'Adilabad', 24), (580, 'Bhadradri Kothagudem', 24), (581, 'Hanumakonda', 24), (582, 'Hyderabad', 24),
    (583, 'Jagitial', 24), (584, 'Jangaon', 24), (585, 'Jayashankar', 24), (586, 'Jogulamba', 24),
    (587, 'Kamareddy', 24), (588, 'Karimnagar', 24), (589, 'Khammam', 24), (590, 'Kumuram Bheem', 24),
    (591, 'Mahabubabad', 24), (592, 'Mahbubnagar', 24), (593, 'Mancherial', 24), (594, 'Medak', 24),
    (595, 'Medchal Malkajgiri', 24), (596, 'Mulugu', 24), (597, 'Nagarkurnool', 24), (598, 'Nalgonda', 24),
    (599, 'Narayanpet', 24), (600, 'Nirmal', 24), (601, 'Nizamabad', 24), (602, 'Peddapalli', 24),
    (603, 'Rajanna Sircilla', 24), (604, 'Ranga Reddy', 24), (605, 'Sangareddy', 24), (606, 'Siddipet', 24),
    (607, 'Suryapet', 24), (608, 'Vikarabad', 24), (609, 'Wanaparthy', 24), (610, 'Warangal', 24),
    (611, 'Yadadri Bhuvanagiri', 24),
    
    -- Tripura (612-619)
    (612, 'Dhalai', 25), (613, 'Gomati', 25), (614, 'Khowai', 25), (615, 'North Tripura', 25),
    (616, 'Sepahijala', 25), (617, 'South Tripura', 25), (618, 'Unakoti', 25), (619, 'West Tripura', 25),
    
    -- Uttar Pradesh (620-694)
    (620, 'Agra', 26), (621, 'Aligarh', 26), (622, 'Ambedkar Nagar', 26), (623, 'Amethi', 26),
    (624, 'Amroha', 26), (625, 'Auraiya', 26), (626, 'Ayodhya', 26), (627, 'Azamgarh', 26),
    (628, 'Baghpat', 26), (629, 'Bahraich', 26), (630, 'Ballia', 26), (631, 'Balrampur', 26),
    (632, 'Banda', 26), (633, 'Barabanki', 26), (634, 'Bareilly', 26), (635, 'Basti', 26),
    (636, 'Bhadohi', 26), (637, 'Bijnor', 26), (638, 'Budaun', 26), (639, 'Bulandshahr', 26),
    (640, 'Chandauli', 26), (641, 'Chitrakoot', 26), (642, 'Deoria', 26), (643, 'Etah', 26),
    (644, 'Etawah', 26), (645, 'Farrukhabad', 26), (646, 'Fatehpur', 26), (647, 'Firozabad', 26),
    (648, 'Gautam Buddha Nagar', 26), (649, 'Ghaziabad', 26), (650, 'Ghazipur', 26), (651, 'Gonda', 26),
    (652, 'Gorakhpur', 26), (653, 'Hamirpur', 26), (654, 'Hapur', 26), (655, 'Hardoi', 26),
    (656, 'Hathras', 26), (657, 'Jalaun', 26), (658, 'Jaunpur', 26), (659, 'Jhansi', 26),
    (660, 'Kannauj', 26), (661, 'Kanpur Dehat', 26), (662, 'Kanpur Nagar', 26), (663, 'Kasganj', 26),
    (664, 'Kaushambi', 26), (665, 'Kheri', 26), (666, 'Kushinagar', 26), (667, 'Lalitpur', 26),
    (668, 'Lucknow', 26), (669, 'Maharajganj', 26), (670, 'Mahoba', 26), (671, 'Mainpuri', 26),
    (672, 'Mathura', 26), (673, 'Mau', 26), (674, 'Meerut', 26), (675, 'Mirzapur', 26),
    (676, 'Moradabad', 26), (677, 'Muzaffarnagar', 26), (678, 'Pilibhit', 26), (679, 'Pratapgarh', 26),
    (680, 'Prayagraj', 26), (681, 'Raebareli', 26), (682, 'Rampur', 26), (683, 'Saharanpur', 26),
    (684, 'Sambhal', 26), (685, 'Sant Kabir Nagar', 26), (686, 'Shahjahanpur', 26), (687, 'Shamli', 26),
    (688, 'Shravasti', 26), (689, 'Siddharthnagar', 26), (690, 'Sitapur', 26), (691, 'Sonbhadra', 26),
    (692, 'Sultanpur', 26), (693, 'Unnao', 26), (694, 'Varanasi', 26),
    
    -- Uttarakhand (695-707)
    (695, 'Almora', 27), (696, 'Bageshwar', 27), (697, 'Chamoli', 27), (698, 'Champawat', 27),
    (699, 'Dehradun', 27), (700, 'Haridwar', 27), (701, 'Nainital', 27), (702, 'Pauri Garhwal', 27),
    (703, 'Pithoragarh', 27), (704, 'Rudraprayag', 27), (705, 'Tehri Garhwal', 27),
    (706, 'Udham Singh Nagar', 27), (707, 'Uttarkashi', 27),
    
    -- West Bengal (708-730)
    (708, 'Alipurduar', 28), (709, 'Bankura', 28), (710, 'Birbhum', 28), (711, 'Cooch Behar', 28),
    (712, 'Dakshin Dinajpur', 28), (713, 'Darjeeling', 28), (714, 'Hooghly', 28), (715, 'Howrah', 28),
    (716, 'Jalpaiguri', 28), (717, 'Jhargram', 28), (718, 'Kalimpong', 28), (719, 'Kolkata', 28),
    (720, 'Malda', 28), (721, 'Murshidabad', 28), (722, 'Nadia', 28), (723, 'North 24 Parganas', 28),
    (724, 'Paschim Bardhaman', 28), (725, 'Paschim Medinipur', 28), (726, 'Purba Bardhaman', 28),
    (727, 'Purba Medinipur', 28), (728, 'Purulia', 28), (729, 'South 24 Parganas', 28),
    (730, 'Uttar Dinajpur', 28),
    
    -- Union Territories
    -- Andaman and Nicobar (731-733)
    (731, 'Nicobar', 29), (732, 'North and Middle Andaman', 29), (733, 'South Andaman', 29),
    
    -- Chandigarh (734)
    (734, 'Chandigarh', 30),
    
    -- Dadra and Nagar Haveli and Daman and Diu (735-737)
    (735, 'Dadra and Nagar Haveli', 31), (736, 'Daman', 31), (737, 'Diu', 31),
    
    -- Delhi (738-748)
    (738, 'Central Delhi', 32), (739, 'East Delhi', 32), (740, 'New Delhi', 32),
    (741, 'North Delhi', 32), (742, 'North East Delhi', 32), (743, 'North West Delhi', 32),
    (744, 'Shahdara', 32), (745, 'South Delhi', 32), (746, 'South East Delhi', 32),
    (747, 'South West Delhi', 32), (748, 'West Delhi', 32),
    
    -- Jammu and Kashmir (749-768)
    (749, 'Anantnag', 33), (750, 'Bandipora', 33), (751, 'Baramulla', 33), (752, 'Budgam', 33),
    (753, 'Doda', 33), (754, 'Ganderbal', 33), (755, 'Jammu', 33), (756, 'Kathua', 33),
    (757, 'Kishtwar', 33), (758, 'Kulgam', 33), (759, 'Kupwara', 33), (760, 'Poonch', 33),
    (761, 'Pulwama', 33), (762, 'Rajouri', 33), (763, 'Ramban', 33), (764, 'Reasi', 33),
    (765, 'Samba', 33), (766, 'Shopian', 33), (767, 'Srinagar', 33), (768, 'Udhampur', 33),
    
    -- Ladakh (769-770)
    (769, 'Kargil', 34), (770, 'Leh', 34),
    
    -- Lakshadweep (771)
    (771, 'Lakshadweep', 35),
    
    -- Puducherry (772-775)
    (772, 'Karaikal', 36), (773, 'Mahe', 36), (774, 'Puducherry', 36), (775, 'Yanam', 36)
) AS source (District_ID, District_Name, State_ID)
ON target.District_ID = source.District_ID
WHEN MATCHED THEN
    UPDATE SET 
        District_Name = source.District_Name,
        State_ID = source.State_ID
WHEN NOT MATCHED THEN
    INSERT (District_ID, District_Name, State_ID)
    VALUES (source.District_ID, source.District_Name, source.State_ID);

PRINT 'Districts merged successfully!';
GO

-- ====================================================================
-- Final Verification
-- ====================================================================

SELECT COUNT(*) as 'Total States' FROM State_Master;
SELECT COUNT(*) as 'Total Districts' FROM District_Master;

-- Sample by State
SELECT s.State_Name, COUNT(d.District_ID) as District_Count
FROM State_Master s
LEFT JOIN District_Master d ON s.State_ID = d.State_ID
GROUP BY s.State_Name
ORDER BY s.State_Name;

PRINT 'Script execution completed successfully!';
PRINT 'All 36 States and 775 Districts have been safely merged!';
GO
