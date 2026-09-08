-- ============================================================
-- UMRoomFaultReporter — SEED CLASSMATE ROSTER
-- Adds 40 students with NO password yet (user_id stays NULL).
-- They'll go through the 'activate your account' flow the
-- first time they log in with their Student ID.
-- Run this in Supabase -> SQL Editor, AFTER database_accounts_setup.sql
-- ============================================================

insert into students (student_id, last_name, first_name, year_program, umdc_email)
values
    ('65134', 'Bacamante', 'Manny', '2nd Year, BSIT', 'bacamante.manny@umindanao.edu.ph'),
    ('62751', 'Bajenting', 'Jamaico', '2nd Year, BSIT', 'bajenting.jamaico@umindanao.edu.ph'),
    ('66608', 'Baritua', 'Jamesmelven', '2nd Year, BSIT', 'baritua.jamesmelven@umindanao.edu.ph'),
    ('66506', 'Barrientos', 'Ian Barry', '2nd Year, BSIT', 'barrientos.ianbarry@umindanao.edu.ph'),
    ('67050', 'Basilgo', 'Ethan Mathew', '2nd Year, BSIT', 'basilgo.ethanmathew@umindanao.edu.ph'),
    ('66960', 'Bedolido', 'Brian Anthony', '2nd Year, BSIT', 'bedolido.briananthony@umindanao.edu.ph'),
    ('66992', 'Butay', 'Fritz Nash', '2nd Year, BSIT', 'butay.fritznash@umindanao.edu.ph'),
    ('67162', 'Cabigas', 'Heart Angel', '2nd Year, BSIT', 'cabigas.heartangel@umindanao.edu.ph'),
    ('66583', 'Carbadilla', 'Dan Mhartien', '2nd Year, BSIT', 'carbadilla.danmhartien@umindanao.edu.ph'),
    ('66702', 'Cenente', 'Axel Jesrie', '2nd Year, BSIT', 'cenente.axeljesrie@umindanao.edu.ph'),
    ('67184', 'Datoon', 'Elisan', '2nd Year, BSIT', 'datoon.elisan@umindanao.edu.ph'),
    ('66868', 'Sanama', 'Joemar', '2nd Year, BSIT', 'sanama.joemar@umindanao.edu.ph'),
    ('66701', 'Dela Cruz', 'Kurt Milbey', '2nd Year, BSIT', 'delacruz.kurtmilbey@umindanao.edu.ph'),
    ('65532', 'Deligero', 'Cathy', '2nd Year, BSIT', 'deligero.cathy@umindanao.edu.ph'),
    ('66666', 'Enanoria', 'John Roe', '2nd Year, BSIT', 'enanoria.johnroe@umindanao.edu.ph'),
    ('66715', 'Justol', 'Christ Terrence', '2nd Year, BSIT', 'justol.christterrence@umindanao.edu.ph'),
    ('66912', 'Lacarion', 'Ryan Angelo', '2nd Year, BSIT', 'lacarion.ryanangelo@umindanao.edu.ph'),
    ('67001', 'Lanticse', 'Annica Kate', '2nd Year, BSIT', 'lanticse.annicakate@umindanao.edu.ph'),
    ('66847', 'Lapaz', 'Prince Charles', '2nd Year, BSIT', 'lapaz.princecharles@umindanao.edu.ph'),
    ('67097', 'Leo', 'Mary Grace', '2nd Year, BSIT', 'leo.marygrace@umindanao.edu.ph'),
    ('66796', 'Mascardo', 'Gamaliel', '2nd Year, BSIT', 'mascardo.gamaliel@umindanao.edu.ph'),
    ('66927', 'Mendoza', 'Zeah', '2nd Year, BSIT', 'mendoza.zeah@umindanao.edu.ph'),
    ('67028', 'Mequila', 'Jake', '2nd Year, BSIT', 'mequila.jake@umindanao.edu.ph'),
    ('66616', 'Monsad', 'Sheira', '2nd Year, BSIT', 'monsad.sheira@umindanao.edu.ph'),
    ('66326', 'Moyong', 'Jasmin', '2nd Year, BSIT', 'moyong.jasmin@umindanao.edu.ph'),
    ('64824', 'Pabunan', 'Edrine John', '2nd Year, BSIT', 'pabunan.edrinejohn@umindanao.edu.ph'),
    ('66182', 'Padillo', 'Ericka', '2nd Year, BSIT', 'padillo.ericka@umindanao.edu.ph'),
    ('66665', 'Paluga', 'Prince John', '2nd Year, BSIT', 'paluga.princejohn@umindanao.edu.ph'),
    ('66829', 'Patricio', 'Jimmar Vincent', '2nd Year, BSIT', 'patricio.jimmarvincent@umindanao.edu.ph'),
    ('66756', 'Quiamco', 'Kian', '2nd Year, BSIT', 'quiamco.kian@umindanao.edu.ph'),
    ('64026', 'Reponte', 'J Jay', '2nd Year, BSIT', 'reponte.jjay@umindanao.edu.ph'),
    ('67125', 'Salva', 'John Mythos', '2nd Year, BSIT', 'salva.johnmythos@umindanao.edu.ph'),
    ('66455', 'Santiago', 'Michael Jay', '2nd Year, BSIT', 'santiago.michaeljay@umindanao.edu.ph'),
    ('67186', 'Saripada', 'Janor', '2nd Year, BSIT', 'saripada.janor@umindanao.edu.ph'),
    ('66305', 'Tampipi', 'Jerald', '2nd Year, BSIT', 'tampipi.jerald@umindanao.edu.ph'),
    ('66783', 'Timosan', 'Ivan Brix', '2nd Year, BSIT', 'timosan.ivanbrix@umindanao.edu.ph'),
    ('65339', 'Tugay', 'Jeric Josh', '2nd Year, BSIT', 'tugay.jericjosh@umindanao.edu.ph'),
    ('66933', 'Ulanulan', 'Ryan Dave', '2nd Year, BSIT', 'ulanulan.ryandave@umindanao.edu.ph'),
    ('67207', 'Valenzuela', 'Mj', '2nd Year, BSIT', 'valenzuela.mj@umindanao.edu.ph'),
    ('67094', 'Valiente', 'Harold', '2nd Year, BSIT', 'valiente.harold@umindanao.edu.ph')
on conflict (student_id) do nothing;
