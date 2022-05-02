let EQN = ['=', ['*', [-1, 'd'], [1, ['+', [1, 'a'], [1, ['*', [1, 'x'], [1, 'z']]], [-1, 'f']]]], ['+', [1, 'c'], [1, '5']]];

const prettyOps = {
	'+': '&plus;',
	'-': '&minus;',
	'*': '&middot;',
	'=': '&equals;'
};

function renderOp(op) {
	let e = document.createElement('span');
	e.className = 'op';
	if (op in prettyOps)
		e.innerHTML = prettyOps[op];
	else
		e.innerText = op;
	return e;
}

function renderAtom(atom) {
	let e = document.createElement('span');
	e.className = 'atom';
	e.innerText = atom;
	return e;
}

function renderParen(paren) {
	let e = document.createElement('span');
	e.className = 'paren';
	e.innerText = paren;
	return e;
}

function wrapIf(node, cond) {
	if (cond) {
		let e = document.createElement('span');
		e.appendChild(renderParen('('));
		e.appendChild(node);
		e.appendChild(renderParen(')'));
		return e;
	} else {
		return node;
	}
}

function makeFrac(numerator, denominator) {
	let e = document.createElement('div');
	e.className = 'fraction';
	e.appendChild(numerator);

	let bar = document.createElement('hr');
	e.appendChild(bar);
	
	e.appendChild(denominator);
	return e;
}

function renderExpr(expr, level, side) {
	if (Array.isArray(expr)) {
		let op = expr[0];
		if (op === '+') {
			let e = document.createElement('span');
			for (let i = 1; i < expr.length; i++) {
				let [coef, childExpr] = expr[i];
				console.assert(coef === 1 || coef === -1);
				if (coef === -1) {
					e.appendChild(renderOp('-'));
				} else if (i !== 1) {
					e.appendChild(renderOp('+'));
				}
				let child = renderExpr(childExpr, level + 1);
				if (level === 1) {
					child.draggable = true;
					child.ondragstart = (ev) => {
						ev.dataTransfer.setData('text/plain', side + ' ' + i);
					};
				}
				e.appendChild(child);
			}
			return e;
		} else if (op === '*') {
			let numerator = document.createElement('span');
			let denominator = document.createElement('span');
			let numNumerator = expr.slice(1).map(e => e[0] === 1).reduce((a,b)=>a+b);
			let numDenominator = expr.length - 1 - numNumerator;
			for (let i = 1; i < expr.length; i++) {
				let [coef, childExpr] = expr[i];
				console.assert(coef === 1 || coef === -1);
				let child = renderExpr(childExpr, level + 1);				
				if (level === 1) {
					child.draggable = true;
					child.ondragstart = (ev) => {
						ev.dataTransfer.setData('text/plain', side + ' ' + i);
					};
				}
				if (coef === 1) {
					if (numerator.children.length > 0) {
						numerator.appendChild(renderOp('*'));
					}
					numerator.appendChild(wrapIf(child, numNumerator > 1 && Array.isArray(childExpr) && childExpr[0] === '+'));
				} else if (coef === -1) {
					if (denominator.children.length > 0) {
						denominator.appendChild(renderOp('*'));
					}
					denominator.appendChild(wrapIf(child, numDenominator > 1 && Array.isArray(childExpr) && childExpr[0] === '+'));
				}
			}
			
			if (numerator.children.length === 0) {
				return makeFrac(renderAtom(1), denominator);
			} else if (denominator.children.length === 0) {
				return numerator;
			} else {
				return makeFrac(numerator, denominator);
			}
		}
	} else {
		let e = renderAtom(expr);
		if (level === 1) {
			e.draggable = true;
			e.ondragstart = (ev) => {
				ev.dataTransfer.setData('text/plain', side);
			};
		}
		return e;
	}
}

function isNumber(x) {
	return typeof(x) === 'number';
}

function simplifyExpr(expr) {
	if (Array.isArray(expr)) {
		console.assert(expr[0] === '+' || expr[0] === '*', expr);
		if (expr.length === 1) {
			if (expr[0] === '+') {
				return 0;
			} else if (expr[0] === '*') {
				return 1;
			}
		} else if (expr.length === 2) {
			let [coef,childExpr] = expr[1];
			if (coef === 1) {
				return simplifyExpr(childExpr);
			} else if (expr[0] === '+' && coef === -1) {
				return ['*', [1,-1], [1,simplifyExpr(childExpr)]];
			} else {
				return [expr[0], [coef,simplifyExpr(childExpr)]];
			}
		} else {
			let simplified = [expr[0]];
			for (let i = 1; i < expr.length; i++) {
				let [coef,childExpr] = expr[i];
				simplified.push([coef,simplifyExpr(childExpr)]);
			}
			return simplified;
		}
	} else {
		return expr;
	}
}

function simplifyIdentities(expr) {
	if (Array.isArray(expr)) {
		let simplified = [expr[0]];
		for (let i = 1; i < expr.length; i++) {
			let [coef,childExpr] = expr[i];
			childExpr = simplifyIdentities(childExpr);
			if (expr[0] === '*' && isNumber(childExpr) && childExpr === 1) {
				// pass
			} else if (expr[0] === '*' && isNumber(childExpr) && childExpr === -1) {
				simplified.push([1,-1]);
			} else {
				simplified.push([coef,childExpr]);
			}
		}
		return simplified;
	} else {
		return expr;
	}
}

function flattenExpr(expr) {
	if (Array.isArray(expr)) {
		let flattened = [expr[0]];
		for (let i = 1; i < expr.length; i++) {
			let [coef,childExpr] = expr[i];
			childExpr = flattenExpr(childExpr);
			if (Array.isArray(childExpr) && expr[0] === childExpr[0]) {
				flattened.push(...childExpr.slice(1).map(x => [coef*x[0],x[1]]));
			} else {
				flattened.push([coef,childExpr]);
			}
		}
		return flattened;
	} else {
		return expr;
	}
}

function distributeMultiplyByMinusOne(expr) {
	if (Array.isArray(expr)) {
		let simplified = [expr[0], ...expr.slice(1).map(x => [x[0],distributeMultiplyByMinusOne(x[1])])];
		if (simplified[0] === '*') {
			let sumI = simplified.findIndex(x => Array.isArray(x[1]) && x[1][0] === '+');
			let minus1s = simplified.filter(x => x[1] === -1);
			if (sumI !== -1 && minus1s.length > 0) {
				let sign = (-1) ** minus1s.length;
				simplified[sumI][1] = [simplified[sumI][1][0], ...simplified[sumI][1].slice(1).map(x => [sign*x[0],x[1]])];
				simplified = simplified.filter(x => x[1] !== -1);
			}
		} else if (simplified[0] === '+') {
			for (let i = 1; i < simplified.length; i++) {
				if (Array.isArray(simplified[i][1]) && simplified[i][1][0] === '*') {
					let minus1s = simplified[i][1].slice(1).filter(x => x[1] === -1);
					let rest = simplified[i][1].slice(1).filter(x => x[1] !== -1);
					if (minus1s.length > 0) {
						let sign = (-1) ** minus1s.length;
						simplified[i] = [sign*simplified[i][0],['*',...rest]];
					}
				}
			}
		}
		return simplified;
	} else {
		return expr;
	}
}

function exprEquals(a, b) {
	if (typeof(a) !== typeof(b))
		return false;
	if (!Array.isArray(a))
		return a === b;
	if (a.length !== b.length)
		return false;
	for (let i = 0; i < a.length; i++)
		if (!exprEquals(a[i], b[i]))
			return false;
	return true;
}

function simplifyExprFixpoint(expr) {
	let expr_ = distributeMultiplyByMinusOne(flattenExpr(simplifyIdentities(simplifyExpr(expr))));
	if (exprEquals(expr, expr_)) {
		return expr;
	} else {
		return simplifyExprFixpoint(expr_);
	}
}

function simplify(eqn) {
	return ['=', simplifyExprFixpoint(eqn[1]), simplifyExprFixpoint(eqn[2])];
}

function move(eqn, srcSide, srcElem, dstSide) {
	let newEqn = structuredClone(eqn);
	if (Array.isArray(newEqn[srcSide])) {
		let [coef,elem] = newEqn[srcSide].splice(srcElem, 1)[0];
		if (Array.isArray(newEqn[dstSide]) && newEqn[srcSide][0] === newEqn[dstSide][0]) {
			newEqn[dstSide].push([-1*coef, elem]);
		} else {
			newEqn[dstSide] = [newEqn[srcSide][0], [1, newEqn[dstSide]], [-1*coef, elem]];
		}
	} else {
		newEqn[dstSide] = ['*', [1,newEqn[dstSide]], [-1,newEqn[srcSide]]];
		newEqn[srcSide] = 1;
	}

	newEqn = simplify(newEqn);
	console.log('move', eqn, newEqn);
	return newEqn;
}

function renderEqn(eqn) {
	console.assert(eqn[0] === '=');
	let lhs = renderExpr(eqn[1], 1, 1);
	let rhs = renderExpr(eqn[2], 1, 2);

	for (let i = 1; i <= 2; i++) {
		let side = [lhs, rhs][i-1];
		side.ondragover = (ev) => {
			ev.preventDefault();
		};
		side.ondrop = (ev) => {
			ev.preventDefault();
			let [srcSide,srcElem] = ev.dataTransfer.getData('text/plain').split(' ').map(x => parseInt(x));
			if (i !== srcSide) {
				EQN = move(eqn, srcSide, srcElem, i);
				updateEqn();
			}
		};
	}

	let e = document.createElement('div');
	e.appendChild(lhs);
	e.appendChild(renderOp('='));
	e.appendChild(rhs);
	return e;
}

function swapEqn() {
	let t = EQN[2];
	EQN[2] = EQN[1];
	EQN[1] = t;
	updateEqn();
}

function updateEqn() {
	let eqnDiv = document.getElementById('eqn');
	while (eqnDiv.hasChildNodes()) {
		eqnDiv.removeChild(eqnDiv.firstChild);
	}
	eqnDiv.appendChild(renderEqn(EQN));	
}

window.addEventListener('DOMContentLoaded', () => {
	updateEqn();
});
